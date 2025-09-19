import { type App, PluginSettingTab, Setting } from 'obsidian';
import type ArticlePastePlugin from './main';
import type { CopyFormat } from './lib/settings';

function formatBytes(value: number): string {
  if (value % (1024 * 1024) === 0 && value !== 0) {
    return `${value / (1024 * 1024)} MB`;
  }
  if (value % 1024 === 0 && value !== 0) {
    return `${value / 1024} KB`;
  }
  return `${value} B`;
}

const COPY_FORMAT_LABELS: Record<CopyFormat, string> = {
  markdown: 'Markdown (preserve syntax)',
  html: 'HTML (render formatting)',
};

export class ArticlePasteSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: ArticlePastePlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Article Paste Settings' });

    new Setting(containerEl)
      .setName('Clipboard image size limit')
      .setDesc(
        'Maximum combined size of embedded images when copying. Set to 0 to disable the limit.',
      )
      .addText((text) => {
        text
          .setPlaceholder('3145728')
          .setValue(String(this.plugin.settings.clipboardSizeLimit))
          .onChange(async (value) => {
            const parsed = Number(value.trim());
            if (Number.isFinite(parsed) && parsed >= 0) {
              this.plugin.settings.clipboardSizeLimit = Math.floor(parsed);
              text.setValue(String(this.plugin.settings.clipboardSizeLimit));
              text.inputEl.title = formatBytes(
                this.plugin.settings.clipboardSizeLimit,
              );
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.title = formatBytes(
          this.plugin.settings.clipboardSizeLimit,
        );
      });

    new Setting(containerEl)
      .setName('Allow markdown-only fallback')
      .setDesc(
        'When the image payload exceeds the limit, drop images and copy markdown only instead of aborting.',
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.markdownOnlyFallback)
          .onChange(async (value) => {
            this.plugin.settings.markdownOnlyFallback = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Copy format')
      .setDesc(
        'Choose whether to paste Markdown syntax or rendered HTML into other editors.',
      )
      .addDropdown((dropdown) => {
        dropdown.addOption('markdown', COPY_FORMAT_LABELS.markdown);
        dropdown.addOption('html', COPY_FORMAT_LABELS.html);
        dropdown.setValue(this.plugin.settings.copyFormat);
        dropdown.onChange(async (value) => {
          if (value === 'markdown' || value === 'html') {
            this.plugin.settings.copyFormat = value;
            await this.plugin.saveSettings();
          }
        });
      });
  }
}
