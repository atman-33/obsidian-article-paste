import type {
  ClipboardComposer,
  ClipboardGuards,
  ClipboardWriter,
  EmbedResolver,
  ImageEncoder,
  SelectionService,
} from './services';
import type {
  ClipboardPayload,
  ComposeClipboardInput,
  EncodedImage,
  ResolvedEmbed,
  SelectionSnapshot,
} from './types';

const NOT_IMPLEMENTED = 'Not implemented yet';

export class UnimplementedSelectionService implements SelectionService {
  async getActiveSelection(): Promise<SelectionSnapshot | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export class UnimplementedEmbedResolver implements EmbedResolver {
  async collectEmbeds(
    _markdown: string,
    _sourcePath: string | null,
  ): Promise<ResolvedEmbed[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export class UnimplementedImageEncoder implements ImageEncoder {
  async encode(_embed: ResolvedEmbed): Promise<EncodedImage> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export class UnimplementedClipboardComposer implements ClipboardComposer {
  async compose(_input: ComposeClipboardInput): Promise<ClipboardPayload> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export class UnimplementedClipboardWriter implements ClipboardWriter {
  async write(_payload: ClipboardPayload): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export class UnimplementedClipboardGuards implements ClipboardGuards {
  async ensureWithinLimits(_images: EncodedImage[]): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
