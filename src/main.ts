import { Plugin } from 'obsidian';
import { CopyArticleCommand } from './commands/copy-article-command';
import { ObsidianNoticeService } from './lib/obsidian-notice-service';
import {
  UnimplementedClipboardComposer,
  UnimplementedClipboardGuards,
  UnimplementedClipboardWriter,
  UnimplementedEmbedResolver,
  UnimplementedImageEncoder,
  UnimplementedSelectionService,
} from './lib/pipeline/stubs';
import type { CopyArticleDependencies } from './lib/pipeline/services';
import { DEFAULT_SETTINGS, type ArticlePasteSettings } from './lib/settings';

export default class ArticlePastePlugin extends Plugin {
  settings: ArticlePasteSettings;
  private copyCommand: CopyArticleCommand | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    const noticeService = new ObsidianNoticeService();

    const dependencies: CopyArticleDependencies = {
      selectionService: new UnimplementedSelectionService(),
      embedResolver: new UnimplementedEmbedResolver(),
      imageEncoder: new UnimplementedImageEncoder(),
      clipboardComposer: new UnimplementedClipboardComposer(),
      clipboardWriter: new UnimplementedClipboardWriter(),
      noticeService,
      clipboardGuards: new UnimplementedClipboardGuards(),
    };

    this.copyCommand = new CopyArticleCommand(dependencies);

    this.addCommand({
      id: 'copy-selection-as-article',
      name: 'Copy selection as article',
      callback: async () => {
        if (!this.copyCommand) {
          noticeService.error('Copy command is not ready.');
          return;
        }
        await this.copyCommand.execute();
      },
    });
  }

  onunload(): void {
    this.copyCommand = null;
  }

  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
