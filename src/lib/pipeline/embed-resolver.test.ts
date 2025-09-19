import { describe, expect, it } from 'vitest';
import type { App, TFile } from 'obsidian';
import { VaultEmbedResolver } from './embed-resolver';

interface FileEntry {
  link?: string;
  path: string;
  file: TFile;
  data: Uint8Array;
}

function createFileEntry(
  path: string,
  extension: string,
  data: Uint8Array,
  link?: string,
): FileEntry {
  const basename = path.split('/').pop() ?? path;
  const file = {
    path,
    extension,
    stat: { size: data.byteLength },
    basename,
    name: basename,
  } as unknown as TFile;
  return { link, path, file, data };
}

function createAppStub(entries: FileEntry[]): App {
  const byLink = new Map<string, TFile>();
  const byPath = new Map<string, TFile>();
  const buffers = new Map<string, Uint8Array>();

  for (const entry of entries) {
    if (entry.link) {
      byLink.set(entry.link, entry.file);
    }
    byPath.set(entry.path, entry.file);
    buffers.set(entry.path, entry.data);
  }

  const metadataCache = {
    getFirstLinkpathDest: (link: string) => byLink.get(link) ?? null,
  };

  const vault = {
    getAbstractFileByPath: (path: string) => byPath.get(path) ?? null,
    readBinary: async (file: TFile) =>
      buffers.get(file.path)?.buffer ?? new ArrayBuffer(0),
  };

  return {
    metadataCache,
    vault,
  } as unknown as App;
}

describe('VaultEmbedResolver', () => {
  it('resolves wiki image embeds to files', async () => {
    const entry = createFileEntry(
      'Media/image.png',
      'png',
      Uint8Array.from([1, 2, 3]),
      'Media/image.png',
    );
    const app = createAppStub([entry]);
    const resolver = new VaultEmbedResolver(app);

    const result = await resolver.collectEmbeds(
      '![[Media/image.png]]',
      'Note.md',
    );

    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].file).toBe(entry.file);
    expect(result.embeds[0].sizeBytes).toBe(3);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns warning when file cannot be found', async () => {
    const app = createAppStub([]);
    const resolver = new VaultEmbedResolver(app);

    const result = await resolver.collectEmbeds('![[Missing.png]]', 'Note.md');

    expect(result.embeds).toHaveLength(0);
    expect(result.warnings).toEqual(['Missing image file: Missing.png']);
  });

  it('skips external markdown image links', async () => {
    const app = createAppStub([]);
    const resolver = new VaultEmbedResolver(app);

    const result = await resolver.collectEmbeds(
      '![](https://example.com/image.png)',
      null,
    );

    expect(result.embeds).toHaveLength(0);
    expect(result.warnings).toEqual([
      'Skipping external image link: https://example.com/image.png',
    ]);
  });

  it('resolves relative markdown image paths against source file', async () => {
    const entry = createFileEntry(
      'media/photo.jpg',
      'jpg',
      Uint8Array.from([5, 6]),
    );
    const app = createAppStub([entry]);
    const resolver = new VaultEmbedResolver(app);

    const result = await resolver.collectEmbeds(
      '![](../media/photo.jpg)',
      'notes/post.md',
    );

    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].file).toBe(entry.file);
    expect(result.embeds[0].mimeType).toBe('image/jpeg');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns when embed is not an image file', async () => {
    const entry = createFileEntry(
      'Docs/manual.pdf',
      'pdf',
      Uint8Array.from([1]),
      'Docs/manual.pdf',
    );
    const app = createAppStub([entry]);
    const resolver = new VaultEmbedResolver(app);

    const result = await resolver.collectEmbeds('![[Docs/manual.pdf]]', null);

    expect(result.embeds).toHaveLength(0);
    expect(result.warnings).toEqual([
      'Unsupported embed type: Docs/manual.pdf',
    ]);
  });
});
