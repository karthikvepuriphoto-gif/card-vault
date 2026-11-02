import { describe, expect, it } from 'vitest';
import { isBackupDue, isValueStale } from './dates';

const NOW = Date.UTC(2026, 10, 2);
const DAY = 24 * 60 * 60 * 1000;

describe('value freshness', () => {
  it('flags a price older than 30 days', () => {
    expect(isValueStale(new Date(NOW - 30 * DAY).toISOString(), true, NOW)).toBe(false);
    expect(isValueStale(new Date(NOW - 30 * DAY - 1).toISOString(), true, NOW)).toBe(true);
  });

  it('does not flag a card with no price', () => {
    expect(isValueStale(null, false, NOW)).toBe(false);
  });

  it('flags a price that has no checked date', () => {
    expect(isValueStale(null, true, NOW)).toBe(true);
  });
});

describe('backup reminder', () => {
  it('is due when there has never been a backup', () => {
    expect(isBackupDue(null, NOW)).toBe(true);
  });

  it('is due only after 14 days', () => {
    expect(isBackupDue(new Date(NOW - 14 * DAY).toISOString(), NOW)).toBe(false);
    expect(isBackupDue(new Date(NOW - 14 * DAY - 1).toISOString(), NOW)).toBe(true);
  });
});
