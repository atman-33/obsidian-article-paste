import type { TFile } from 'obsidian';

export function createFileStub(path: string, extension: string): TFile {
  // Minimal fields to satisfy TFile when real vault files are unnecessary
  return {
    path,
    extension,
  } as unknown as TFile;
}
