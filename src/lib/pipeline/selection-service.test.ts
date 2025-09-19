import { describe, expect, it } from 'vitest';
import type { App, Editor, MarkdownView } from 'obsidian';
import { EditorSelectionService } from './selection-service';

type EditorStubOptions = {
  selection?: string;
  value?: string;
};

type MarkdownViewConstructor = new (...args: unknown[]) => MarkdownView;

function createEditorStub(options: EditorStubOptions): Editor {
  const { selection = '', value = '' } = options;
  return {
    getSelection: () => selection,
    getValue: () => value,
  } as unknown as Editor;
}

function createViewStub(editor: Editor, path?: string): MarkdownView {
  return {
    editor,
    file: path ? ({ path } as unknown) : undefined,
  } as unknown as MarkdownView;
}

function createAppStub(
  view: MarkdownView | null,
  expectedCtor: MarkdownViewConstructor,
): App {
  return {
    workspace: {
      getActiveViewOfType: (ctor: MarkdownViewConstructor) =>
        ctor === expectedCtor ? view : null,
    },
  } as unknown as App;
}

const MARKDOWN_VIEW_CTOR_STUB =
  function MarkdownViewStub() {} as unknown as MarkdownViewConstructor;

describe('EditorSelectionService', () => {
  it('returns null when no markdown view is active', async () => {
    const app = createAppStub(null, MARKDOWN_VIEW_CTOR_STUB);
    const service = new EditorSelectionService(app, MARKDOWN_VIEW_CTOR_STUB);

    const snapshot = await service.getActiveSelection();

    expect(snapshot).toBeNull();
  });

  it('returns the current selection when present', async () => {
    const editor = createEditorStub({
      selection: 'Selected text',
      value: 'Full text',
    });
    const view = createViewStub(editor, 'note.md');
    const app = createAppStub(view, MARKDOWN_VIEW_CTOR_STUB);
    const service = new EditorSelectionService(app, MARKDOWN_VIEW_CTOR_STUB);

    const snapshot = await service.getActiveSelection();

    expect(snapshot).not.toBeNull();
    expect(snapshot?.markdown).toBe('Selected text');
    expect(snapshot?.sourcePath).toBe('note.md');
    expect(snapshot?.containsEmbeds).toBe(false);
  });

  it('falls back to full document when selection is empty', async () => {
    const editor = createEditorStub({
      selection: '',
      value: 'Full text with ![[image.png]]',
    });
    const view = createViewStub(editor, 'another.md');
    const app = createAppStub(view, MARKDOWN_VIEW_CTOR_STUB);
    const service = new EditorSelectionService(app, MARKDOWN_VIEW_CTOR_STUB);

    const snapshot = await service.getActiveSelection();

    expect(snapshot?.markdown).toBe('Full text with ![[image.png]]');
    expect(snapshot?.sourcePath).toBe('another.md');
    expect(snapshot?.containsEmbeds).toBe(true);
  });
});
