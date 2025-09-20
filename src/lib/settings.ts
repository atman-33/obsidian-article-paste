export type CopyFormat = 'markdown' | 'html';

export interface ArticlePasteSettings {
  clipboardSizeLimit: number;
  markdownOnlyFallback: boolean;
  copyFormat: CopyFormat;
}

export const DEFAULT_SETTINGS: ArticlePasteSettings = {
  clipboardSizeLimit: 3 * 1024 * 1024,
  markdownOnlyFallback: true,
  copyFormat: 'markdown',
};
