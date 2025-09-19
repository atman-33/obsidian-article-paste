import { Notice } from 'obsidian';
import type { NoticeService } from './pipeline/services';

const DEFAULT_DURATION = 6000;

export class ObsidianNoticeService implements NoticeService {
  success(message: string): void {
    new Notice(message, DEFAULT_DURATION);
  }

  warn(message: string): void {
    new Notice(message, DEFAULT_DURATION);
  }

  error(message: string): void {
    console.error('[article-paste]', message);
    new Notice(message, DEFAULT_DURATION);
  }
}
