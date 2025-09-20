import type { ClipboardWriter } from './services';
import type { ClipboardPayload, EncodedImage } from './types';

type ClipboardData = {
  text?: string;
  html?: string;
  image?: EncodedImage['nativeImage'];
};

type ElectronClipboard = {
  write(data: ClipboardData, type?: string): void;
};

type ElectronModule = {
  clipboard: ElectronClipboard;
};

function loadElectronClipboard(): ElectronClipboard | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron') as ElectronModule;
    return electron.clipboard;
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== 'MODULE_NOT_FOUND' && process.env.NODE_ENV !== 'production') {
      console.warn('[article-paste] Electron clipboard unavailable:', error);
    }
    return null;
  }
}

function coerceError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(
    typeof error === 'string' ? error : 'Unknown clipboard error',
  );
}

export class ElectronClipboardWriter implements ClipboardWriter {
  private readonly clipboard: ElectronClipboard | null;

  constructor(clipboard?: ElectronClipboard | null) {
    this.clipboard = clipboard ?? loadElectronClipboard();
  }

  async write(payload: ClipboardPayload): Promise<void> {
    if (!this.clipboard) {
      throw new Error('Electron clipboard API is unavailable.');
    }

    const data: ClipboardData = {
      text: payload.text,
      html: payload.html,
    };

    const primaryImage = this.pickPrimaryImage(payload.images);
    if (primaryImage) {
      data.image = primaryImage.nativeImage;
    }

    try {
      this.clipboard.write(data);
    } catch (error) {
      throw coerceError(error);
    }
  }

  private pickPrimaryImage(images: EncodedImage[]): EncodedImage | null {
    for (const image of images) {
      if (image.nativeImage) {
        return image;
      }
    }
    return null;
  }
}
