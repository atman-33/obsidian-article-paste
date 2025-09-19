import { describe, expect, it } from 'vitest';
import { ObsidianNoticeService } from './obsidian-notice-service';
import type { NoticeService, NoticeSession } from './pipeline/services';

type CallRecord = {
  kind: 'success' | 'warning' | 'error';
  message: string;
};

class PresenterStub {
  calls: CallRecord[] = [];

  showSuccess(message: string) {
    this.calls.push({ kind: 'success', message });
  }

  showWarning(message: string) {
    this.calls.push({ kind: 'warning', message });
  }

  showError(message: string) {
    this.calls.push({ kind: 'error', message });
  }
}

function createService(presenter: PresenterStub): NoticeService {
  return new ObsidianNoticeService(presenter as any);
}

describe('ObsidianNoticeService', () => {
  it('emits success notice when only success provided', () => {
    const presenter = new PresenterStub();
    const service = createService(presenter);
    const session = service.createSession();

    session.success('Done');
    session.flush();

    expect(presenter.calls).toEqual([{ kind: 'success', message: 'Done' }]);
  });

  it('aggregates multiple warnings into a single notice', () => {
    const presenter = new PresenterStub();
    const session = createService(presenter).createSession();

    session.warn('Missing image A');
    session.warn('Missing image B');
    session.flush();

    expect(presenter.calls).toHaveLength(1);
    expect(presenter.calls[0]).toEqual({
      kind: 'warning',
      message: 'Missing image A\nMissing image B',
    });
  });

  it('includes success message when warnings exist', () => {
    const presenter = new PresenterStub();
    const session: NoticeSession = createService(presenter).createSession();

    session.success('Copied with warnings');
    session.warn('Missing image');
    session.flush();

    expect(presenter.calls[0]).toEqual({
      kind: 'warning',
      message: 'Copied with warnings\nMissing image',
    });
  });

  it('prefers error messages and appends warnings', () => {
    const presenter = new PresenterStub();
    const session = createService(presenter).createSession();

    session.warn('Partial data');
    session.error('Failed to write clipboard');
    session.flush();

    expect(presenter.calls[0]).toEqual({
      kind: 'error',
      message: 'Failed to write clipboard\nPartial data',
    });
  });

  it('does nothing when no messages recorded', () => {
    const presenter = new PresenterStub();
    const session = createService(presenter).createSession();

    session.flush();

    expect(presenter.calls).toHaveLength(0);
  });
});
