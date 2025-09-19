import type { CopyArticleDependencies } from '../lib/pipeline/services';
import type {
  ClipboardPayload,
  EncodedImage,
  ResolvedEmbed,
  SelectionSnapshot,
} from '../lib/pipeline/types';

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

export class CopyArticleCommand {
  constructor(private readonly deps: CopyArticleDependencies) {}

  async execute(): Promise<void> {
    const {
      selectionService,
      embedResolver,
      imageEncoder,
      clipboardComposer,
      clipboardWriter,
      noticeService,
      clipboardGuards,
    } = this.deps;

    const noticeSession = noticeService.createSession();

    let selection: SelectionSnapshot | null = null;

    try {
      selection = await selectionService.getActiveSelection();
    } catch (error) {
      noticeSession.error(`Failed to read selection: ${formatError(error)}`);
      noticeSession.flush();
      return;
    }

    if (!selection) {
      noticeSession.warn('Nothing selected to copy.');
      noticeSession.flush();
      return;
    }

    const warnings: string[] = [];
    let embeds: ResolvedEmbed[] = [];

    try {
      const result = await embedResolver.collectEmbeds(
        selection.markdown,
        selection.sourcePath,
      );
      embeds = result.embeds;
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
        for (const warning of result.warnings) {
          noticeSession.warn(warning);
        }
      }
    } catch (error) {
      const message = `Unable to resolve embeds: ${formatError(error)}`;
      warnings.push(message);
      noticeSession.warn(message);
    }

    const encodedImages: EncodedImage[] = [];

    for (const embed of embeds) {
      try {
        const encoded = await imageEncoder.encode(embed);
        encodedImages.push(encoded);
      } catch (error) {
        const message = `Failed to encode ${embed.originalLink}: ${formatError(error)}`;
        warnings.push(message);
        noticeSession.warn(message);
      }
    }

    if (clipboardGuards) {
      try {
        const guardResult =
          await clipboardGuards.ensureWithinLimits(encodedImages);
        if (guardResult.warnings.length > 0) {
          warnings.push(...guardResult.warnings);
          for (const warning of guardResult.warnings) {
            noticeSession.warn(warning);
          }
        }
        if (!guardResult.allow) {
          noticeSession.flush();
          return;
        }
      } catch (error) {
        const message = formatError(error);
        warnings.push(message);
        noticeSession.warn(message);
        noticeSession.flush();
        return;
      }
    }

    let payload: ClipboardPayload;
    try {
      payload = await clipboardComposer.compose({
        selection,
        embeds,
        encodedImages,
      });
    } catch (error) {
      noticeSession.error(
        `Failed to compose clipboard payload: ${formatError(error)}`,
      );
      noticeSession.flush();
      return;
    }

    payload.warnings.push(...warnings);

    try {
      await clipboardWriter.write(payload);
    } catch (error) {
      noticeSession.error(`Clipboard write failed: ${formatError(error)}`);
      noticeSession.flush();
      return;
    }

    if (payload.warnings.length > 0) {
      for (const warning of payload.warnings) {
        noticeSession.warn(warning);
      }
      noticeSession.flush();
      return;
    }

    noticeSession.success('Selection copied for article paste.');
    noticeSession.flush();
  }
}
