import type { CardRecord, Category } from '../types';

export type SortKey = 'newest' | 'name' | 'value-desc' | 'value-asc';

export function normalizeSearch(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function collectionStats(cards: CardRecord[]): { worth: number; count: number; unpriced: number } {
  let worth = 0;
  let count = 0;
  let unpriced = 0;
  for (const card of cards) {
    const quantity = Number.isFinite(card.quantity) ? card.quantity : 0;
    count += quantity;
    if (card.currentValue == null) unpriced += quantity;
    else worth += card.currentValue * quantity;
  }
  return { worth: Math.round(worth * 100) / 100, count, unpriced };
}

export function cardCountLabel(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`;
}

export function filterCards(
  cards: CardRecord[],
  options: { query: string; category: Category | 'all'; favourites: boolean },
): CardRecord[] {
  const query = normalizeSearch(options.query.trim());
  const parts = query ? query.split(/\s+/).filter(Boolean) : [];
  return cards.filter((card) => {
    if (options.category !== 'all' && card.category !== options.category) return false;
    if (options.favourites && !card.favourite) return false;
    if (parts.length === 0) return true;
    const haystack = normalizeSearch(
      [
        card.name,
        card.year,
        card.setName,
        card.cardNumber,
        card.brand,
        card.location,
        card.notes,
        card.category,
        card.gradeCompany,
        card.grade,
      ].join(' '),
    );
    return parts.every((part) => haystack.includes(part));
  });
}

export function sortCards(cards: CardRecord[], sort: SortKey): CardRecord[] {
  const copy = [...cards];
  copy.sort((a, b) => {
    if (sort === 'name') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || b.createdAt.localeCompare(a.createdAt);
    }
    if (sort === 'value-desc' || sort === 'value-asc') {
      if (a.currentValue == null && b.currentValue == null) return b.createdAt.localeCompare(a.createdAt);
      if (a.currentValue == null) return 1;
      if (b.currentValue == null) return -1;
      const diff = sort === 'value-desc' ? b.currentValue - a.currentValue : a.currentValue - b.currentValue;
      return diff || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
  return copy;
}
