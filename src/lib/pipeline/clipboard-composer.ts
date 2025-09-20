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

function wrapBlock(content: string): string {
  return `<p>${content}</p>`;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'embed'; original: string };

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

    const bodyHtml =
      format === 'html'
        ? await this.composeHtml(
            selection.markdown,
            selection.sourcePath,
            imageBuckets,
            resolvedLinks,
            warnings,
          )
        : this.composeEscaped(
            selection.markdown,
            imageBuckets,
            resolvedLinks,
            warnings,
          );

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
    const segments = this.splitIntoSegments(markdown);
    const htmlSegments: string[] = [];

    for (const segment of segments) {
      if (segment.type === 'text') {
        if (segment.value.length === 0) {
          continue;
        }
        htmlSegments.push(wrapBlock(formatPlainTextSegment(segment.value)));
        continue;
      }

      const bucket = imageBuckets.get(segment.original);
      if (bucket && bucket.length > 0) {
        const image = bucket.shift();
        if (!image) {
          warnings.push(`No encoded image available for ${segment.original}`);
          htmlSegments.push(
            wrapBlock(formatPlainTextSegment(segment.original)),
          );
          continue;
        }
        htmlSegments.push(wrapBlock(buildImageTag(image)));
      } else {
        if (resolvedLinks.has(segment.original)) {
          warnings.push(`No encoded image available for ${segment.original}`);
        }
        htmlSegments.push(wrapBlock(formatPlainTextSegment(segment.original)));
      }
    }

    return htmlSegments.join('');
  }

  private async composeHtml(
    markdown: string,
    sourcePath: string | null,
    imageBuckets: Map<string, EncodedImage[]>,
    resolvedLinks: Set<string>,
    warnings: string[],
  ): Promise<string> {
    const segments = this.splitIntoSegments(markdown);
    const htmlSegments: string[] = [];

    for (const segment of segments) {
      if (segment.type === 'text') {
        const trimmed = segment.value.trim();
        if (trimmed.length === 0) {
          continue;
        }
        const rendered = await this.markdownRenderer.render(
          segment.value,
          sourcePath,
        );
        htmlSegments.push(rendered);
        continue;
      }

      const bucket = imageBuckets.get(segment.original);
      if (bucket && bucket.length > 0) {
        const image = bucket.shift();
        if (!image) {
          warnings.push(`No encoded image available for ${segment.original}`);
          htmlSegments.push(
            await this.markdownRenderer.render(segment.original, sourcePath),
          );
          continue;
        }
        htmlSegments.push(wrapBlock(buildImageTag(image)));
      } else {
        if (resolvedLinks.has(segment.original)) {
          warnings.push(`No encoded image available for ${segment.original}`);
        }
        htmlSegments.push(
          await this.markdownRenderer.render(segment.original, sourcePath),
        );
      }
    }

    return htmlSegments.join('');
  }

  private splitIntoSegments(markdown: string): Segment[] {
    const segments: Segment[] = [];
    let cursor = 0;
    const pattern = new RegExp(EMBED_PATTERN.source, 'g');

    for (;;) {
      const match = pattern.exec(markdown);
      if (!match) {
        break;
      }
      const [original] = match;
      if (match.index > cursor) {
        segments.push({
          type: 'text',
          value: markdown.slice(cursor, match.index),
        });
      }
      segments.push({ type: 'embed', original });
      cursor = pattern.lastIndex;
    }

    if (cursor < markdown.length) {
      segments.push({ type: 'text', value: markdown.slice(cursor) });
    }

    return segments;
  }
}
