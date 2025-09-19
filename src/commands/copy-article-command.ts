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

    let selection: SelectionSnapshot | null = null;

    try {
      selection = await selectionService.getActiveSelection();
    } catch (error) {
      noticeService.error(`Failed to read selection: ${formatError(error)}`);
      return;
    }

    if (!selection) {
      noticeService.warn('Nothing selected to copy.');
      return;
    }

    const warnings: string[] = [];
    let embeds: ResolvedEmbed[] = [];

    try {
      embeds = await embedResolver.collectEmbeds(
        selection.markdown,
        selection.sourcePath,
      );
    } catch (error) {
      warnings.push(`Unable to resolve embeds: ${formatError(error)}`);
    }

    const encodedImages: EncodedImage[] = [];

    for (const embed of embeds) {
      try {
        const encoded = await imageEncoder.encode(embed);
        encodedImages.push(encoded);
      } catch (error) {
        warnings.push(
          `Failed to encode ${embed.originalLink}: ${formatError(error)}`,
        );
      }
    }

    if (clipboardGuards) {
      try {
        await clipboardGuards.ensureWithinLimits(encodedImages);
      } catch (error) {
        warnings.push(formatError(error));
        noticeService.warn(warnings.join('\n'));
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
      noticeService.error(
        `Failed to compose clipboard payload: ${formatError(error)}`,
      );
      return;
    }

    payload.warnings.push(...warnings);

    try {
      await clipboardWriter.write(payload);
    } catch (error) {
      noticeService.error(`Clipboard write failed: ${formatError(error)}`);
      return;
    }

    if (payload.warnings.length > 0) {
      noticeService.warn(payload.warnings.join('\n'));
      return;
    }

    noticeService.success('Selection copied for article paste.');
  }
}
