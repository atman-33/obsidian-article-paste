import type { TFile } from 'obsidian';

export type NativeImageLike = unknown;

export interface SelectionSnapshot {
  markdown: string;
  sourcePath: string | null;
  containsEmbeds: boolean;
}

export interface ResolvedEmbed {
  originalLink: string;
  file: TFile;
  buffer: ArrayBufferLike;
  mimeType: string;
  sizeBytes: number;
}

export interface EncodedImage {
  dataUri: string;
  nativeImage: NativeImageLike;
  sizeBytes: number;
  mimeType: string;
  original: ResolvedEmbed;
}

export interface ClipboardPayload {
  text: string;
  html: string;
  images: EncodedImage[];
  warnings: string[];
}

export interface ComposeClipboardInput {
  selection: SelectionSnapshot;
  embeds: ResolvedEmbed[];
  encodedImages: EncodedImage[];
}

export interface EmbedResolutionResult {
  embeds: ResolvedEmbed[];
  warnings: string[];
}
