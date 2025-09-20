import { describe, expect, it } from 'vitest';
import { ClipboardSizeGuard } from './clipboard-guard';
import type { EncodedImage } from './types';
import type { ArticlePasteSettings } from '../settings';
import { createFileStub } from '../testing/file-stub';

function createImage(sizeBytes: number): EncodedImage {
  return {
    dataUri: 'data:image/png;base64,AAA',
    nativeImage: {},
    sizeBytes,
    mimeType: 'image/png',
    original: {
      originalLink: '![[img.png]]',
      file: createFileStub('img.png', 'png'),
      buffer: new ArrayBuffer(0),
      mimeType: 'image/png',
      sizeBytes,
    },
  };
}

describe('ClipboardSizeGuard', () => {
  it('allows images within limit', async () => {
    const guard = new ClipboardSizeGuard(
      () =>
        ({
          clipboardSizeLimit: 10,
          markdownOnlyFallback: true,
          copyFormat: 'markdown',
        }) as ArticlePasteSettings,
    );

    const result = await guard.ensureWithinLimits([createImage(5)]);
    expect(result.allow).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('blocks when limit exceeded and fallback disabled', async () => {
    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 5,
      markdownOnlyFallback: false,
      copyFormat: 'markdown',
    };
    const guard = new ClipboardSizeGuard(() => settings);

    const images = [createImage(10)];
    const result = await guard.ensureWithinLimits(images);

    expect(result.allow).toBe(false);
    expect(result.warnings[0]).toContain('exceeds limit');
    expect(images).toHaveLength(1);
  });

  it('removes images when fallback enabled', async () => {
    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 5,
      markdownOnlyFallback: true,
      copyFormat: 'markdown',
    };
    const guard = new ClipboardSizeGuard(() => settings);
    const images = [createImage(10)];

    const result = await guard.ensureWithinLimits(images);

    expect(result.allow).toBe(true);
    expect(result.warnings[0]).toContain('Images skipped');
    expect(images).toHaveLength(0);
  });
});
