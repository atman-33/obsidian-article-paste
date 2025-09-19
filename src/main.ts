import { MarkdownView, Plugin } from 'obsidian';
import { CopyArticleCommand } from './commands/copy-article-command';
import { VaultEmbedResolver } from './lib/pipeline/embed-resolver';
import { ElectronImageEncoder } from './lib/pipeline/image-encoder';
import { HtmlClipboardComposer } from './lib/pipeline/clipboard-composer';
import { ElectronClipboardWriter } from './lib/pipeline/clipboard-writer';
import { ObsidianNoticeService } from './lib/obsidian-notice-service';
import { EditorSelectionService } from './lib/pipeline/selection-service';
import { ClipboardSizeGuard } from './lib/pipeline/clipboard-guard';
import { MarkdownItRenderer } from './lib/pipeline/markdown-renderer';
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
    const markdownRenderer = new MarkdownItRenderer();

    const dependencies: CopyArticleDependencies = {
      selectionService: new EditorSelectionService(this.app),
      embedResolver: new VaultEmbedResolver(this.app),
      imageEncoder: new ElectronImageEncoder(),
      clipboardComposer: new HtmlClipboardComposer(
        () => this.settings,
        markdownRenderer,
      ),
      clipboardWriter: new ElectronClipboardWriter(),
      noticeService,
      clipboardGuards,
    };

    this.copyCommand = new CopyArticleCommand(dependencies);

    const commandCallback = async () => {
      if (!this.copyCommand) {
        const session = noticeService.createSession();
        session.error('Copy command is not ready.');
        session.flush();
        return;
      }
      await this.copyCommand.execute();
    };

    this.addCommand({
      id: 'copy-selection-as-article',
      name: 'Copy selection as article',
      callback: commandCallback,
    });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        if (!this.copyCommand || !(view instanceof MarkdownView)) {
          return;
        }
        const selection = editor.getSelection();
        menu.addItem((item) => {
          item
            .setTitle('Copy selection as article')
            .setIcon('copy')
            .setDisabled(!selection)
            .onClick(async () => {
              await commandCallback();
            });
        });
      }),
    );
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
