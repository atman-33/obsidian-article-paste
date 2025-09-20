import type {
  ClipboardPayload,
  ComposeClipboardInput,
  EncodedImage,
  EmbedResolutionResult,
  ResolvedEmbed,
  SelectionSnapshot,
} from './types';

export interface SelectionService {
  getActiveSelection(): Promise<SelectionSnapshot | null>;
}

export interface EmbedResolver {
  collectEmbeds(
    markdown: string,
    sourcePath: string | null,
  ): Promise<EmbedResolutionResult>;
}

export interface ImageEncoder {
  encode(embed: ResolvedEmbed): Promise<EncodedImage>;
}

export interface ClipboardComposer {
  compose(input: ComposeClipboardInput): Promise<ClipboardPayload>;
}

export interface ClipboardWriter {
  write(payload: ClipboardPayload): Promise<void>;
}

export interface MarkdownRendererService {
  render(markdown: string, sourcePath: string | null): Promise<string>;
}

export interface NoticeSession {
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  flush(): void;
}

export interface NoticeService {
  createSession(): NoticeSession;
}

export interface ClipboardGuardResult {
  allow: boolean;
  warnings: string[];
}

export interface ClipboardGuards {
  ensureWithinLimits(images: EncodedImage[]): Promise<ClipboardGuardResult>;
}

export interface CopyArticleDependencies {
  selectionService: SelectionService;
  embedResolver: EmbedResolver;
  imageEncoder: ImageEncoder;
  clipboardComposer: ClipboardComposer;
  clipboardWriter: ClipboardWriter;
  noticeService: NoticeService;
  clipboardGuards?: ClipboardGuards;
}
