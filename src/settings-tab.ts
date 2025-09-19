import { type App, PluginSettingTab, Setting } from 'obsidian';
import type ArticlePastePlugin from './main';

function formatBytes(value: number): string {
  if (value % (1024 * 1024) === 0 && value !== 0) {
    return `${value / (1024 * 1024)} MB`;
  }
  if (value % 1024 === 0 && value !== 0) {
    return `${value / 1024} KB`;
  }
  return `${value} B`;
}

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
  }
}
