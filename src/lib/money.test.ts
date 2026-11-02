import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from './money';

describe('money', () => {
  it('formats dollars', () => {
    expect(formatMoney(12.5)).toBe('$12.50');
  });

  it('parses a typed price and rejects junk', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('$1,250.50')).toBe(1250.5);
    expect(parseMoney('12.')).toBe(12);
    expect(parseMoney('nope')).toBe('invalid');
    expect(parseMoney('-4')).toBe('invalid');
  });
});
