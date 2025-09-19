import type { ArticlePasteSettings } from '../settings';
import type { ClipboardGuardResult, ClipboardGuards } from './services';
import type { EncodedImage } from './types';

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export class ClipboardSizeGuard implements ClipboardGuards {
  constructor(private readonly getSettings: () => ArticlePasteSettings) {}

  async ensureWithinLimits(
    images: EncodedImage[],
  ): Promise<ClipboardGuardResult> {
    const settings = this.getSettings();
    const limit = settings.clipboardSizeLimit;
    if (!limit || limit <= 0 || images.length === 0) {
      return { allow: true, warnings: [] };
    }

    const totalBytes = images.reduce((sum, image) => sum + image.sizeBytes, 0);
    if (totalBytes <= limit) {
      return { allow: true, warnings: [] };
    }

    const formattedTotal = formatBytes(totalBytes);
    const formattedLimit = formatBytes(limit);

    if (!settings.markdownOnlyFallback) {
      const warning = `Clipboard payload ${formattedTotal} exceeds limit ${formattedLimit}. Adjust settings or reduce image size.`;
      return { allow: false, warnings: [warning] };
    }

    images.splice(0, images.length);
    const warning = `Images skipped: payload ${formattedTotal} exceeds limit ${formattedLimit}. Markdown content copied instead.`;
    return { allow: true, warnings: [warning] };
  }
}
