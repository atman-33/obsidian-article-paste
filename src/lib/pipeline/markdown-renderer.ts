import MarkdownIt from 'markdown-it';
import type { MarkdownRendererService } from './services';

export class MarkdownItRenderer implements MarkdownRendererService {
  private readonly md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: false,
    });
  }

  async render(markdown: string): Promise<string> {
    return this.md.render(markdown);
  }
}
