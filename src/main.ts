import { Plugin } from 'obsidian';
import { CopyArticleCommand } from './commands/copy-article-command';
import { VaultEmbedResolver } from './lib/pipeline/embed-resolver';
import { ElectronImageEncoder } from './lib/pipeline/image-encoder';
import { HtmlClipboardComposer } from './lib/pipeline/clipboard-composer';
import { ElectronClipboardWriter } from './lib/pipeline/clipboard-writer';
import { ObsidianNoticeService } from './lib/obsidian-notice-service';
import { EditorSelectionService } from './lib/pipeline/selection-service';
import { UnimplementedClipboardGuards } from './lib/pipeline/stubs';
import type { CopyArticleDependencies } from './lib/pipeline/services';
import { DEFAULT_SETTINGS, type ArticlePasteSettings } from './lib/settings';

export default class ArticlePastePlugin extends Plugin {
  settings: ArticlePasteSettings;
  private copyCommand: CopyArticleCommand | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    const noticeService = new ObsidianNoticeService();

    const dependencies: CopyArticleDependencies = {
      selectionService: new EditorSelectionService(this.app),
      embedResolver: new VaultEmbedResolver(this.app),
      imageEncoder: new ElectronImageEncoder(),
      clipboardComposer: new HtmlClipboardComposer(),
      clipboardWriter: new ElectronClipboardWriter(),
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
