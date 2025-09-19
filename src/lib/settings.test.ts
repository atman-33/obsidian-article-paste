import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';

describe('DEFAULT_SETTINGS', () => {
  it('uses the expected default secret value', () => {
    expect(DEFAULT_SETTINGS.mySetting).toBe('default');
  });
});
