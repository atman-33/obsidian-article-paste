import { MarkdownView } from 'obsidian';
import type { App, Editor } from 'obsidian';
import type { SelectionService } from './services';
import type { SelectionSnapshot } from './types';

type MarkdownViewConstructor = new (...args: unknown[]) => MarkdownView;

const EMBED_PATTERN = /!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]+\]\]/;

export class EditorSelectionService implements SelectionService {
  constructor(
    private readonly app: App,
    private readonly markdownViewCtor: MarkdownViewConstructor | null = typeof MarkdownView ===
    'undefined'
      ? null
      : (MarkdownView as unknown as MarkdownViewConstructor),
  ) {}

  async getActiveSelection(): Promise<SelectionSnapshot | null> {
    const view = this.getActiveMarkdownView();
    if (!view) {
      return null;
    }

    const selection = this.readSelection(view.editor);
    if (!selection) {
      return null;
    }

    return {
      markdown: selection,
      sourcePath: view.file?.path ?? null,
      containsEmbeds: EMBED_PATTERN.test(selection),
    };
  }

  private getActiveMarkdownView(): MarkdownView | null {
    if (!this.markdownViewCtor) {
      return null;
    }

    return (
      this.app.workspace.getActiveViewOfType(this.markdownViewCtor) ?? null
    );
  }

  private readSelection(editor: Editor): string | null {
    const selectedText = editor.getSelection();
    if (selectedText && selectedText.length > 0) {
      return selectedText;
    }

    const fullText = editor.getValue();
    if (fullText && fullText.length > 0) {
      return fullText;
    }

    return null;
  }
}
