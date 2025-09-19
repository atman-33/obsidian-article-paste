export class MarkdownView {
  constructor(
    public editor: unknown = null,
    public file: { path: string } | null = null,
  ) {}
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}

export class Plugin {}

export class TFile {
  basename: string;
  name: string;
  stat: { size: number };

  constructor(
    public path: string,
    public extension: string,
    options: { basename?: string; size?: number } = {},
  ) {
    this.basename = options.basename ?? this.path.split('/').pop() ?? this.path;
    this.name = this.basename;
    this.stat = { size: options.size ?? 0 };
  }
}