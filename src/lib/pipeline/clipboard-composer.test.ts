import { describe, expect, it } from 'vitest';
import { HtmlClipboardComposer } from './clipboard-composer';
import type { ArticlePasteSettings } from '../settings';
import type {
  ComposeClipboardInput,
  EncodedImage,
  ResolvedEmbed,
  SelectionSnapshot,
} from './types';
import type { MarkdownRendererService } from './services';

function createSelection(
  markdown: string,
  sourcePath: string | null = 'note.md',
): SelectionSnapshot {
  return {
    markdown,
    sourcePath,
    containsEmbeds: /!\[\[|!\[/.test(markdown),
  };
}

function createEmbed(
  link: string,
  path: string,
  mimeType: string,
  size: number,
): ResolvedEmbed {
  return {
    originalLink: link,
    file: { path, extension: path.split('.').pop() ?? 'png' } as any,
    buffer: new ArrayBuffer(size),
    mimeType,
    sizeBytes: size,
  };
}

function createEncoded(
  embed: ResolvedEmbed,
  dataUri: string,
  size: number,
): EncodedImage {
  return {
    dataUri,
    nativeImage: {},
    sizeBytes: size,
    mimeType: 'image/png',
    original: embed,
  };
}

const markdownRendererStub: MarkdownRendererService = {
  async render(markdown: string): Promise<string> {
    return `<p>${markdown}</p>`;
  },
};

describe('HtmlClipboardComposer', () => {
  it('replaces embeds with data URI images and escapes surrounding text (markdown format)', async () => {
    const embed = createEmbed('![[img.png]]', 'assets/img.png', 'image/png', 3);
    const encoded = createEncoded(embed, 'data:image/png;base64,AAA', 3);
    const selection = createSelection('Intro text\n![[img.png]]\nMore text');

    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 0,
      markdownOnlyFallback: true,
      copyFormat: 'markdown',
    };

    const composer = new HtmlClipboardComposer(
      () => settings,
      markdownRendererStub,
    );
    const input: ComposeClipboardInput = {
      selection,
      embeds: [embed],
      encodedImages: [encoded],
    };

    const payload = await composer.compose(input);

    expect(payload.text).toBe(selection.markdown);
    expect(payload.html).toContain('<img');
    expect(payload.html).toContain('data:image/png;base64,AAA');
    expect(payload.html).toContain('Intro text'.replace(/</g, '&lt;'));
    expect(payload.html).toContain('<br>More text');
    expect(payload.warnings).toHaveLength(0);
  });

  it('renders markdown to HTML when html format selected', async () => {
    const embed = createEmbed('![[img.png]]', 'assets/img.png', 'image/png', 3);
    const encoded = createEncoded(embed, 'data:image/png;base64,AAA', 3);
    const selection = createSelection('# Heading\n\n![[img.png]]');

    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 0,
      markdownOnlyFallback: true,
      copyFormat: 'html',
    };

    const composer = new HtmlClipboardComposer(
      () => settings,
      markdownRendererStub,
    );
    const payload = await composer.compose({
      selection,
      embeds: [embed],
      encodedImages: [encoded],
    });

    expect(payload.html).toContain('<p># Heading');
    expect(payload.html).toContain('<img src="data:image/png;base64,AAA"');
    expect(payload.warnings).toHaveLength(0);
  });

  it('adds warning when resolved embed has no encoded image', async () => {
    const embed = createEmbed(
      '![[missing.png]]',
      'missing.png',
      'image/png',
      1,
    );
    const selection = createSelection('![[missing.png]]');
    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 0,
      markdownOnlyFallback: true,
      copyFormat: 'markdown',
    };

    const composer = new HtmlClipboardComposer(
      () => settings,
      markdownRendererStub,
    );
    const payload = await composer.compose({
      selection,
      embeds: [embed],
      encodedImages: [],
    });

    expect(payload.html).toContain('![[missing.png]]');
    expect(payload.warnings).toContain(
      'No encoded image available for ![[missing.png]]',
    );
  });

  it('ignores unresolved embeds when no encoded image exists', async () => {
    const selection = createSelection('![[unresolved.png]]');
    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 0,
      markdownOnlyFallback: true,
      copyFormat: 'markdown',
    };

    const composer = new HtmlClipboardComposer(
      () => settings,
      markdownRendererStub,
    );

    const payload = await composer.compose({
      selection,
      embeds: [],
      encodedImages: [],
    });

    expect(payload.warnings).toHaveLength(0);
  });

  it('emits warning when encoded image unused', async () => {
    const embed = createEmbed('![[img.png]]', 'assets/img.png', 'image/png', 3);
    const encoded = createEncoded(embed, 'data:image/png;base64,AAA', 3);
    const selection = createSelection('No images here');
    const settings: ArticlePasteSettings = {
      clipboardSizeLimit: 0,
      markdownOnlyFallback: true,
      copyFormat: 'markdown',
    };

    const composer = new HtmlClipboardComposer(
      () => settings,
      markdownRendererStub,
    );
    const payload = await composer.compose({
      selection,
      embeds: [embed],
      encodedImages: [encoded],
    });

    expect(payload.warnings).toContain('Unused encoded image for ![[img.png]]');
  });
});
