export interface ArticlePasteSettings {
  clipboardSizeLimit: number;
  markdownOnlyFallback: boolean;
}

export const DEFAULT_SETTINGS: ArticlePasteSettings = {
  clipboardSizeLimit: 3 * 1024 * 1024,
  markdownOnlyFallback: true,
};
