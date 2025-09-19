import { describe, expect, it, vi } from 'vitest';
import { ElectronClipboardWriter } from './clipboard-writer';
import type { ClipboardPayload, EncodedImage } from './types';

function createPayload(
  overrides: Partial<ClipboardPayload> = {},
): ClipboardPayload {
  return {
    text: 'plain text',
    html: '<p>plain text</p>',
    images: [],
    warnings: [],
    ...overrides,
  };
}

describe('ElectronClipboardWriter', () => {
  it('writes text and html to clipboard', async () => {
    const write = vi.fn();
    const clipboard = { write };
    const writer = new ElectronClipboardWriter(clipboard);

    const payload = createPayload();
    await writer.write(payload);

    expect(write).toHaveBeenCalledWith({
      text: 'plain text',
      html: '<p>plain text</p>',
    });
  });

  it('includes first native image in clipboard data', async () => {
    const nativeImage = { id: 'img' };
    const image: EncodedImage = {
      dataUri: 'data:image/png;base64,AAA',
      nativeImage,
      sizeBytes: 3,
      mimeType: 'image/png',
      original: {
        originalLink: '![[img.png]]',
        file: { path: 'img.png', extension: 'png' } as any,
        buffer: new ArrayBuffer(0),
        mimeType: 'image/png',
        sizeBytes: 0,
      },
    };

    const write = vi.fn();
    const clipboard = { write };
    const writer = new ElectronClipboardWriter(clipboard);

    await writer.write(createPayload({ images: [image] }));

    expect(write).toHaveBeenCalledWith({
      text: 'plain text',
      html: '<p>plain text</p>',
      image: nativeImage,
    });
  });

  it('throws when clipboard is unavailable', async () => {
    const writer = new ElectronClipboardWriter(null);
    await expect(writer.write(createPayload())).rejects.toThrow(
      'Electron clipboard API is unavailable.',
    );
  });

  it('propagates clipboard errors', async () => {
    const write = vi.fn(() => {
      throw new Error('write failed');
    });
    const clipboard = { write };
    const writer = new ElectronClipboardWriter(clipboard);

    await expect(writer.write(createPayload())).rejects.toThrow('write failed');
  });
});
