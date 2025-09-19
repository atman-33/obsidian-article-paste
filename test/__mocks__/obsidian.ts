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