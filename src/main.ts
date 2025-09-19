import { Plugin } from 'obsidian';
import { CopyArticleCommand } from './commands/copy-article-command';
import { VaultEmbedResolver } from './lib/pipeline/embed-resolver';
import { ElectronImageEncoder } from './lib/pipeline/image-encoder';
import { HtmlClipboardComposer } from './lib/pipeline/clipboard-composer';
import { ElectronClipboardWriter } from './lib/pipeline/clipboard-writer';
import { ObsidianNoticeService } from './lib/obsidian-notice-service';
import { EditorSelectionService } from './lib/pipeline/selection-service';
import { ClipboardSizeGuard } from './lib/pipeline/clipboard-guard';
import type { CopyArticleDependencies } from './lib/pipeline/services';
import { DEFAULT_SETTINGS, type ArticlePasteSettings } from './lib/settings';
import { ArticlePasteSettingTab } from './settings-tab';

export default class ArticlePastePlugin extends Plugin {
  settings: ArticlePasteSettings;
  private copyCommand: CopyArticleCommand | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new ArticlePasteSettingTab(this.app, this));

    const noticeService = new ObsidianNoticeService();
    const clipboardGuards = new ClipboardSizeGuard(() => this.settings);

    const dependencies: CopyArticleDependencies = {
      selectionService: new EditorSelectionService(this.app),
      embedResolver: new VaultEmbedResolver(this.app),
      imageEncoder: new ElectronImageEncoder(),
      clipboardComposer: new HtmlClipboardComposer(),
      clipboardWriter: new ElectronClipboardWriter(),
      noticeService,
      clipboardGuards,
    };

    this.copyCommand = new CopyArticleCommand(dependencies);

    this.addCommand({
      id: 'copy-selection-as-article',
      name: 'Copy selection as article',
      callback: async () => {
        if (!this.copyCommand) {
          const session = noticeService.createSession();
          session.error('Copy command is not ready.');
          session.flush();
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
