import { describe, expect, it } from 'vitest';
import { ElectronImageEncoder } from './image-encoder';
import type { ResolvedEmbed } from './types';

class NativeImageInstanceStub {
  buffer: Buffer = Buffer.alloc(0);
  constructor(private readonly pngOutput?: Buffer) {}

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  toPNG(): Buffer {
    return this.pngOutput ?? this.buffer;
  }
}

class NativeImageModuleStub {
  private readonly queue: NativeImageInstanceStub[];

  constructor(instances: NativeImageInstanceStub[]) {
    this.queue = [...instances];
  }

  createFromBuffer(buffer: Buffer) {
    const instance = this.queue.shift();
    if (!instance) {
      throw new Error('No more nativeImage instances in stub queue');
    }
    instance.buffer = buffer;
    return instance;
  }
}

function createEmbed(options: {
  buffer: Uint8Array;
  mimeType: string;
  path?: string;
}): ResolvedEmbed {
  const { buffer, mimeType, path = 'image.png' } = options;
  return {
    originalLink: '![[image]]',
    file: { path, extension: path.split('.').pop() ?? 'png' } as any,
    buffer: buffer.buffer,
    mimeType,
    sizeBytes: buffer.byteLength,
  };
}

describe('ElectronImageEncoder', () => {
  it('returns PNG data URI when source already PNG', async () => {
    const pngData = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const moduleStub = new NativeImageModuleStub([
      new NativeImageInstanceStub(),
      new NativeImageInstanceStub(),
    ]);
    const encoder = new ElectronImageEncoder(moduleStub);

    const embed = createEmbed({
      buffer: new Uint8Array(pngData),
      mimeType: 'image/png',
    });
    const encoded = await encoder.encode(embed);

    expect(encoded.mimeType).toBe('image/png');
    expect(encoded.sizeBytes).toBe(pngData.length);
    expect(encoded.dataUri).toBe(
      `data:image/png;base64,${pngData.toString('base64')}`,
    );
  });

  it('converts non-PNG source to PNG', async () => {
    const sourceData = Buffer.from([0x01, 0x02]);
    const converted = Buffer.from([0xff, 0x00, 0xff]);
    const moduleStub = new NativeImageModuleStub([
      new NativeImageInstanceStub(converted),
      new NativeImageInstanceStub(),
    ]);
    const encoder = new ElectronImageEncoder(moduleStub);

    const embed = createEmbed({
      buffer: new Uint8Array(sourceData),
      mimeType: 'image/jpeg',
      path: 'photo.jpg',
    });
    const result = await encoder.encode(embed);

    expect(result.mimeType).toBe('image/png');
    expect(result.sizeBytes).toBe(converted.length);
    expect(result.dataUri).toBe(
      `data:image/png;base64,${converted.toString('base64')}`,
    );
  });

  it('throws when nativeImage is unavailable', async () => {
    const encoder = new ElectronImageEncoder(null);
    const embed = createEmbed({
      buffer: new Uint8Array([1]),
      mimeType: 'image/png',
    });

    await expect(encoder.encode(embed)).rejects.toThrow(
      'Electron nativeImage API is unavailable.',
    );
  });
});
