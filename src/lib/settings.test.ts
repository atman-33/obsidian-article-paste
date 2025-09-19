import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';

describe('DEFAULT_SETTINGS', () => {
  it('sets a positive clipboard size limit', () => {
    expect(DEFAULT_SETTINGS.clipboardSizeLimit).toBeGreaterThan(0);
  });

  it('enables markdown fallback by default', () => {
    expect(DEFAULT_SETTINGS.markdownOnlyFallback).toBe(true);
  });

  it('defaults copy format to markdown', () => {
    expect(DEFAULT_SETTINGS.copyFormat).toBe('markdown');
  });
});
