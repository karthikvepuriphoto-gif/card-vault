import { describe, expect, it } from 'vitest';
import type { CardRecord } from '../types';
import { buildCsv } from './csv';

const card: CardRecord = {
  id: '1',
  name: 'Ohtani, Shohei',
  year: '2024',
  setName: 'Chrome',
  cardNumber: '1',
  brand: 'Topps',
  category: 'Baseball',
  conditionType: 'raw',
  conditionNote: '',
  gradeCompany: '',
  grade: '',
  quantity: 1,
  purchasePrice: 8,
  currentValue: 12.5,
  valueUpdatedAt: '2026-11-02T00:00:00.000Z',
  valueSource: 'manual',
  location: 'Binder',
  notes: '=cmd',
  favourite: true,
  frontImageId: null,
  backImageId: null,
  pokemonCardId: null,
  pokemonPriceVariant: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
};

describe('csv export', () => {
  it('quotes commas and neutralizes formula text', () => {
    const csv = buildCsv([card]);
    expect(csv.split('\n')[0]).toContain('Current value (USD)');
    expect(csv).toContain('"Ohtani, Shohei"');
    expect(csv).toContain("'=cmd");
    expect(csv).toContain('12.50');
    expect(csv).toContain('yes');
  });
});
