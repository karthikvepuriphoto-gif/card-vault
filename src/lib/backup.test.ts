import { describe, expect, it } from 'vitest';
import type { CardRecord } from '../types';
import { backupCardFromRecord, blobToDataUrl, dataUrlToBlob, mergeCardRecords, parseBackup } from './backup';

const record: CardRecord = {
  id: 'card-1',
  name: 'Pikachu',
  year: '1999',
  setName: 'Base',
  cardNumber: '58',
  brand: 'Pokémon',
  category: 'Pokémon',
  conditionType: 'raw',
  conditionNote: 'played',
  gradeCompany: '',
  grade: '',
  quantity: 1,
  purchasePrice: 3,
  currentValue: 12,
  valueUpdatedAt: '2026-11-01T00:00:00.000Z',
  valueSource: 'manual',
  location: 'Box',
  notes: '',
  favourite: true,
  frontImageId: 'old-front',
  backImageId: null,
  pokemonCardId: 'base1-58',
  pokemonPriceVariant: 'normal',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('backup files', () => {
  it('round-trips a card and its photo bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 255, 0, 10]);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const file = {
      app: 'card-vault',
      version: 1,
      exportedAt: '2026-11-02T00:00:00.000Z',
      cards: [backupCardFromRecord(record, await blobToDataUrl(blob), null)],
    };
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.cards[0]?.record.name).toBe('Pikachu');
    expect(parsed.cards[0]?.record.favourite).toBe(true);
    expect(parsed.cards[0]?.record.frontImageId).toBeNull();
    const restored = new Uint8Array(await parsed.cards[0]!.frontImage!.arrayBuffer());
    expect([...restored]).toEqual([...bytes]);
    expect(dataUrlToBlob(await blobToDataUrl(blob)).size).toBe(blob.size);
  });

  it('rejects a file that is not a Card Vault backup', () => {
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
    expect(parseBackup('not json').ok).toBe(false);
  });

  it('merges by id and keeps cards that are only on the device', () => {
    const other = { ...record, id: 'card-2', name: 'Other' };
    const updated = { ...record, name: 'Pikachu updated' };
    const merged = mergeCardRecords([record, other], [updated]);
    expect(merged.map((card) => card.name).sort()).toEqual(['Other', 'Pikachu updated']);
  });
});
