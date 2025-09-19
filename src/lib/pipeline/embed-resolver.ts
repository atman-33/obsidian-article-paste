import type { App, TFile } from 'obsidian';
import type { EmbedResolver } from './services';
import type { EmbedResolutionResult, ResolvedEmbed } from './types';

interface EmbedMatch {
  original: string;
  target: string;
}

interface ResolveOutcome {
  embed?: ResolvedEmbed;
  warning?: string;
}

const WIKI_EMBED_PATTERN = /!\[\[([^\]]+)\]\]/g;
const MD_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)]+)\)/g;
const EXTERNAL_LINK_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

export class VaultEmbedResolver implements EmbedResolver {
  constructor(private readonly app: App) {}

  async collectEmbeds(
    markdown: string,
    sourcePath: string | null,
  ): Promise<EmbedResolutionResult> {
    const matches = this.extractEmbeds(markdown);
    const embeds: ResolvedEmbed[] = [];
    const warnings: string[] = [];

    for (const match of matches) {
      try {
        const outcome = await this.resolveMatch(match, sourcePath ?? undefined);
        if (outcome.warning) {
          warnings.push(outcome.warning);
          continue;
        }
        if (outcome.embed) {
          embeds.push(outcome.embed);
        }
      } catch (error) {
        warnings.push(
          `Failed to resolve ${match.target}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return { embeds, warnings };
  }

  private extractEmbeds(markdown: string): EmbedMatch[] {
    const matches: EmbedMatch[] = [];

    for (const wikiMatch of markdown.matchAll(WIKI_EMBED_PATTERN)) {
      const raw = wikiMatch[1];
      const target = this.parseWikiTarget(raw);
      if (target) {
        matches.push({ original: wikiMatch[0], target });
      }
    }

    for (const mdMatch of markdown.matchAll(MD_IMAGE_PATTERN)) {
      const raw = mdMatch[1];
      const target = this.parseMarkdownTarget(raw);
      if (target) {
        matches.push({ original: mdMatch[0], target });
      }
    }

    return matches;
  }

  private parseWikiTarget(raw: string): string | null {
    const [pathPart] = raw.split('|', 1);
    const trimmed = pathPart.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.split('#', 1)[0].trim();
  }

  private parseMarkdownTarget(raw: string): string | null {
    let target = raw.trim();
    if (!target) {
      return null;
    }

    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1).trim();
    }

    if (
      (target.startsWith('"') && target.endsWith('"')) ||
      (target.startsWith("'") && target.endsWith("'"))
    ) {
      target = target.slice(1, -1).trim();
    }

    const spaceIndex = target.indexOf(' ');
    if (spaceIndex !== -1) {
      target = target.slice(0, spaceIndex);
    }

    return target;
  }

  private async resolveMatch(
    match: EmbedMatch,
    sourcePath?: string,
  ): Promise<ResolveOutcome> {
    const target = match.target;

    if (this.isExternalLink(target)) {
      return { warning: `Skipping external image link: ${target}` };
    }

    const file = this.resolveFile(target, sourcePath);
    if (!file) {
      return { warning: `Missing image file: ${target}` };
    }

    if (!this.isImageFile(file)) {
      return { warning: `Unsupported embed type: ${file.path}` };
    }

    const buffer = await this.app.vault.readBinary(file);
    const arrayBuffer = this.normalizeBuffer(buffer);
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { warning: `Empty image file: ${file.path}` };
    }

    const mimeType = this.getMimeType(file.extension);
    if (!mimeType) {
      return { warning: `Unknown image format: ${file.path}` };
    }

    return {
      embed: {
        originalLink: match.original,
        file,
        buffer: arrayBuffer,
        mimeType,
        sizeBytes: arrayBuffer.byteLength,
      },
    };
  }

  private resolveFile(target: string, sourcePath?: string): TFile | null {
    const cache = this.app.metadataCache;
    const vault = this.app.vault;
    const resolved =
      cache?.getFirstLinkpathDest?.(target, sourcePath ?? '') ?? null;

    if (this.isTFile(resolved)) {
      return resolved;
    }

    const fromVault = vault?.getAbstractFileByPath?.(target) ?? null;
    if (this.isTFile(fromVault)) {
      return fromVault;
    }

    if (sourcePath) {
      const resolvedPath = this.joinRelativePath(sourcePath, target);
      const relativeFile = vault?.getAbstractFileByPath?.(resolvedPath) ?? null;
      if (this.isTFile(relativeFile)) {
        return relativeFile;
      }
    }

    return null;
  }

  private joinRelativePath(sourcePath: string, target: string): string {
    if (target.startsWith('/')) {
      return target.slice(1);
    }

    const sourceSegments = sourcePath.split('/');
    sourceSegments.pop();
    const targetSegments = target.split('/');

    for (const segment of targetSegments) {
      if (segment === '.' || segment === '') {
        continue;
      }
      if (segment === '..') {
        if (sourceSegments.length > 0) {
          sourceSegments.pop();
        }
        continue;
      }
      sourceSegments.push(segment);
    }

    return sourceSegments.join('/');
  }

  private normalizeBuffer(
    buffer: ArrayBufferLike | ArrayBufferView | null,
  ): ArrayBufferLike | null {
    if (!buffer) {
      return null;
    }
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    if (
      typeof SharedArrayBuffer !== 'undefined' &&
      buffer instanceof SharedArrayBuffer
    ) {
      return buffer;
    }
    if (ArrayBuffer.isView(buffer)) {
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
    }
    return null;
  }

  private isExternalLink(target: string): boolean {
    return EXTERNAL_LINK_PATTERN.test(target) || target.startsWith('data:');
  }

  private isTFile(value: unknown): value is TFile {
    return (
      typeof value === 'object' &&
      value !== null &&
      'path' in value &&
      'extension' in value &&
      typeof (value as TFile).path === 'string'
    );
  }

  private isImageFile(file: TFile): boolean {
    const mimeType = this.getMimeType(file.extension);
    return Boolean(mimeType);
  }

  private getMimeType(extension: string): string | null {
    const normalized = extension.toLowerCase();
    switch (normalized) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
      case 'svgz':
        return 'image/svg+xml';
      case 'bmp':
        return 'image/bmp';
      case 'tiff':
      case 'tif':
        return 'image/tiff';
      default:
        return null;
    }
  }
}
