import type { ClipboardComposer } from './services';
import type {
  ClipboardPayload,
  ComposeClipboardInput,
  EncodedImage,
} from './types';
import type { ArticlePasteSettings } from '../settings';
import type { MarkdownRendererService } from './services';

const EMBED_PATTERN = /!\[\[[^\]]+\]\]|!\[[^\]]*\]\([^)]*\)/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function formatPlainTextSegment(segment: string): string {
  return escapeHtml(segment).replace(/\r?\n/g, '<br>');
}

function buildImageTag(image: EncodedImage): string {
  const src = image.dataUri;
  const dataPath = escapeAttribute(image.original.file.path);
  const altText = escapeAttribute(image.original.originalLink);
  return `<img src="${src}" data-path="${dataPath}" alt="${altText}">`;
}

interface PlaceholderEntry {
  token: string;
  image: EncodedImage;
}

export class HtmlClipboardComposer implements ClipboardComposer {
  constructor(
    private readonly getSettings: () => ArticlePasteSettings,
    private readonly markdownRenderer: MarkdownRendererService,
  ) {}

  async compose(input: ComposeClipboardInput): Promise<ClipboardPayload> {
    const { selection, embeds, encodedImages } = input;
    const format = this.getSettings().copyFormat;

    const imageBuckets = new Map<string, EncodedImage[]>();
    for (const image of encodedImages) {
      const key = image.original.originalLink;
      const bucket = imageBuckets.get(key) ?? [];
      bucket.push(image);
      imageBuckets.set(key, bucket);
    }

    const resolvedLinks = new Set(embeds.map((embed) => embed.originalLink));
    const warnings: string[] = [];

    let bodyHtml: string;

    if (format === 'html') {
      bodyHtml = await this.composeHtml(
        selection.markdown,
        selection.sourcePath,
        imageBuckets,
        resolvedLinks,
        warnings,
      );
    } else {
      bodyHtml = this.composeEscaped(
        selection.markdown,
        imageBuckets,
        resolvedLinks,
        warnings,
      );
    }

    for (const [original, bucket] of imageBuckets.entries()) {
      if (bucket.length > 0) {
        warnings.push(`Unused encoded image for ${original}`);
      }
    }

    const attributes = selection.sourcePath
      ? ` data-source-path="${escapeAttribute(selection.sourcePath)}"`
      : '';
    const html = `<!DOCTYPE html><html><body><div${attributes}>${bodyHtml}</div></body></html>`;

    return {
      text: selection.markdown,
      html,
      images: encodedImages,
      warnings,
    };
  }

  private composeEscaped(
    markdown: string,
    imageBuckets: Map<string, EncodedImage[]>,
    resolvedLinks: Set<string>,
    warnings: string[],
  ): string {
    const htmlSegments: string[] = [];
    let cursor = 0;

    const appendPlain = (start: number, end: number) => {
      if (start >= end) {
        return;
      }
      const segment = markdown.slice(start, end);
      if (segment.length > 0) {
        htmlSegments.push(formatPlainTextSegment(segment));
      }
    };

    const pattern = new RegExp(EMBED_PATTERN.source, 'g');
    for (;;) {
      const match = pattern.exec(markdown);
      if (!match) {
        break;
      }

      const [original] = match;
      appendPlain(cursor, match.index);
      cursor = pattern.lastIndex;

      const bucket = imageBuckets.get(original);
      if (bucket && bucket.length > 0) {
        const image = bucket.shift();
        if (!image) {
          warnings.push(`No encoded image available for ${original}`);
          htmlSegments.push(formatPlainTextSegment(original));
          continue;
        }
        htmlSegments.push(buildImageTag(image));
      } else {
        if (resolvedLinks.has(original)) {
          warnings.push(`No encoded image available for ${original}`);
        }
        htmlSegments.push(formatPlainTextSegment(original));
      }
    }

    appendPlain(cursor, markdown.length);

    return htmlSegments.join('');
  }

  private async composeHtml(
    markdown: string,
    sourcePath: string | null,
    imageBuckets: Map<string, EncodedImage[]>,
    resolvedLinks: Set<string>,
    warnings: string[],
  ): Promise<string> {
    let processed = '';
    const placeholders: PlaceholderEntry[] = [];
    let cursor = 0;

    const pattern = new RegExp(EMBED_PATTERN.source, 'g');
    for (;;) {
      const match = pattern.exec(markdown);
      if (!match) {
        break;
      }
      const [original] = match;
      processed += markdown.slice(cursor, match.index);
      cursor = pattern.lastIndex;

      const bucket = imageBuckets.get(original);
      if (bucket && bucket.length > 0) {
        const image = bucket.shift();
        if (!image) {
          warnings.push(`No encoded image available for ${original}`);
          processed += original;
          continue;
        }
        const token = `__INTERNAL_IMAGE_${placeholders.length}__`;
        placeholders.push({ token, image });
        processed += token;
      } else {
        if (resolvedLinks.has(original)) {
          warnings.push(`No encoded image available for ${original}`);
        }
        processed += original;
      }
    }
    processed += markdown.slice(cursor);

    const rendered = await this.markdownRenderer.render(processed, sourcePath);
    let html = rendered;

    for (const { token, image } of placeholders) {
      const tag = buildImageTag(image);
      html = html.split(token).join(tag);
    }

    return html;
  }
}
