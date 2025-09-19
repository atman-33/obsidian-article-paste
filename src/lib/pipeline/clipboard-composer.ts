import type { ClipboardComposer } from './services';
import type {
  ClipboardPayload,
  ComposeClipboardInput,
  EncodedImage,
} from './types';

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

export class HtmlClipboardComposer implements ClipboardComposer {
  async compose(input: ComposeClipboardInput): Promise<ClipboardPayload> {
    const { selection, embeds, encodedImages } = input;

    const imageBuckets = new Map<string, EncodedImage[]>();
    for (const image of encodedImages) {
      const key = image.original.originalLink;
      const bucket = imageBuckets.get(key) ?? [];
      bucket.push(image);
      imageBuckets.set(key, bucket);
    }

    const resolvedLinks = new Set(embeds.map((embed) => embed.originalLink));
    const warnings: string[] = [];
    const markdown = selection.markdown;
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

    for (const [original, bucket] of imageBuckets.entries()) {
      if (bucket.length > 0) {
        warnings.push(`Unused encoded image for ${original}`);
      }
    }

    const bodyHtml = htmlSegments.join('');
    const attributes = selection.sourcePath
      ? ` data-source-path="${escapeAttribute(selection.sourcePath)}"`
      : '';
    const html = `<!DOCTYPE html><html><body><div${attributes}>${bodyHtml}</div></body></html>`;

    return {
      text: markdown,
      html,
      images: encodedImages,
      warnings,
    };
  }
}
