import type { ImageEncoder } from './services';
import type { EncodedImage, ResolvedEmbed } from './types';

interface NativeImageInstance {
  isEmpty(): boolean;
  toPNG(): Buffer;
}

interface NativeImageModule {
  createFromBuffer(buffer: Buffer): NativeImageInstance;
}

interface ElectronModule {
  nativeImage: NativeImageModule;
}

function toBuffer(data: ArrayBufferLike): Buffer {
  return Buffer.from(new Uint8Array(data));
}

function loadElectron(): ElectronModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('electron') as ElectronModule;
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== 'MODULE_NOT_FOUND' && process.env.NODE_ENV !== 'production') {
      console.warn('[article-paste] Electron nativeImage unavailable:', error);
    }
    return null;
  }
}

export class ElectronImageEncoder implements ImageEncoder {
  private readonly nativeImage: NativeImageModule | null;

  constructor(nativeImage?: NativeImageModule | null) {
    this.nativeImage = nativeImage ?? loadElectron()?.nativeImage ?? null;
  }

  async encode(embed: ResolvedEmbed): Promise<EncodedImage> {
    if (!this.nativeImage) {
      throw new Error('Electron nativeImage API is unavailable.');
    }

    const sourceBuffer = toBuffer(embed.buffer);
    const decoded = this.nativeImage.createFromBuffer(sourceBuffer);
    if (decoded.isEmpty()) {
      throw new Error(`Unable to decode image: ${embed.file.path}`);
    }

    const pngBuffer =
      embed.mimeType === 'image/png' ? sourceBuffer : decoded.toPNG();
    if (pngBuffer.length === 0) {
      throw new Error(`Failed to convert image to PNG: ${embed.file.path}`);
    }

    const pngImage = this.nativeImage.createFromBuffer(pngBuffer);
    if (pngImage.isEmpty()) {
      throw new Error(`Unable to load PNG data for image: ${embed.file.path}`);
    }

    const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    return {
      dataUri,
      nativeImage: pngImage,
      sizeBytes: pngBuffer.length,
      mimeType: 'image/png',
      original: embed,
    };
  }
}
