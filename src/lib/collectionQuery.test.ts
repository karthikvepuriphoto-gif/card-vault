import { describe, expect, it } from 'vitest';
import type { CardRecord } from '../types';
import { collectionStats, filterCards, sortCards } from './collectionQuery';

function card(patch: Partial<CardRecord>): CardRecord {
  return {
    id: '1',
    name: 'Card',
    year: '',
    setName: '',
    cardNumber: '',
    brand: '',
    category: 'Other',
    conditionType: 'raw',
    conditionNote: '',
    gradeCompany: '',
    grade: '',
    quantity: 1,
    purchasePrice: null,
    currentValue: null,
    valueUpdatedAt: null,
    valueSource: '',
    location: '',
    notes: '',
    favourite: false,
    frontImageId: null,
    backImageId: null,
    pokemonCardId: null,
    pokemonPriceVariant: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

describe('collection stats', () => {
  it('multiplies value by quantity and counts cards that need a price', () => {
    const stats = collectionStats([
      card({ id: 'a', currentValue: 10, quantity: 2 }),
      card({ id: 'b', currentValue: null, quantity: 3 }),
    ]);
    expect(stats).toEqual({ worth: 20, count: 5, unpriced: 3 });
  });
});

describe('filters and sorting', () => {
  const cards = [
    card({ id: 'a', name: 'Pikachu', category: 'Pokémon', currentValue: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
    card({ id: 'b', name: 'Mahomes', category: 'Football', currentValue: 40, favourite: true, createdAt: '2026-02-01T00:00:00.000Z' }),
    card({ id: 'c', name: 'Judge', category: 'Baseball', currentValue: null, createdAt: '2026-03-01T00:00:00.000Z' }),
  ];

  it('matches Pokémon without the accent', () => {
    expect(filterCards(cards, { query: 'pokemon', category: 'all', favourites: false }).map((item) => item.id)).toEqual(['a']);
  });

  it('can show only starred cards', () => {
    expect(filterCards(cards, { query: '', category: 'all', favourites: true }).map((item) => item.id)).toEqual(['b']);
  });

  it('sorts by value with missing prices last', () => {
    expect(sortCards(cards, 'value-desc').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(sortCards(cards, 'value-asc').map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
