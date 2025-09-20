import { Notice } from 'obsidian';
import type { NoticeService, NoticeSession } from './pipeline/services';

const DEFAULT_DURATION = 6000;

interface NoticePresenter {
  showSuccess(message: string): void;
  showWarning(message: string): void;
  showError(message: string): void;
}

class ObsidianNoticePresenter implements NoticePresenter {
  showSuccess(message: string): void {
    new Notice(message, DEFAULT_DURATION);
  }

  showWarning(message: string): void {
    new Notice(message, DEFAULT_DURATION);
  }

  showError(message: string): void {
    console.error('[article-paste]', message);
    new Notice(message, DEFAULT_DURATION);
  }
}

function uniqueLines(lines: string[]): string[] {
  return Array.from(new Set(lines));
}

class AggregatingNoticeSession implements NoticeSession {
  private successMessage: string | null = null;
  private readonly warnings: string[] = [];
  private readonly errors: string[] = [];

  constructor(private readonly presenter: NoticePresenter) {}

  success(message: string): void {
    this.successMessage = message;
  }

  warn(message: string): void {
    if (message) {
      this.warnings.push(message);
    }
  }

  error(message: string): void {
    if (message) {
      this.errors.push(message);
    }
  }

  flush(): void {
    if (this.errors.length > 0) {
      const errorMessage = uniqueLines(this.errors).join('\n');
      const warningMessage = uniqueLines(this.warnings).join('\n');
      const combined = warningMessage
        ? `${errorMessage}\n${warningMessage}`
        : errorMessage;
      this.presenter.showError(combined);
      return;
    }

    if (this.warnings.length > 0) {
      const warningMessage = uniqueLines(this.warnings).join('\n');
      const combined = this.successMessage
        ? `${this.successMessage}\n${warningMessage}`
        : warningMessage;
      this.presenter.showWarning(combined);
      return;
    }

    if (this.successMessage) {
      this.presenter.showSuccess(this.successMessage);
    }
  }
}

export class ObsidianNoticeService implements NoticeService {
  constructor(
    private readonly presenter: NoticePresenter = new ObsidianNoticePresenter(),
  ) {}

  createSession(): NoticeSession {
    return new AggregatingNoticeSession(this.presenter);
  }
}
