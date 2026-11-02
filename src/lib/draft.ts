import type { CardDraft, CardRecord } from '../types';

export function emptyDraft(): CardDraft {
  return {
    name: '',
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
    pokemonCardId: null,
    pokemonPriceVariant: null,
  };
}

export function draftFromCard(card: CardRecord): CardDraft {
  return {
    name: card.name,
    year: card.year,
    setName: card.setName,
    cardNumber: card.cardNumber,
    brand: card.brand,
    category: card.category,
    conditionType: card.conditionType,
    conditionNote: card.conditionNote,
    gradeCompany: card.gradeCompany,
    grade: card.grade,
    quantity: card.quantity,
    purchasePrice: card.purchasePrice,
    currentValue: card.currentValue,
    valueUpdatedAt: card.valueUpdatedAt,
    valueSource: card.valueSource,
    location: card.location,
    notes: card.notes,
    favourite: card.favourite,
    pokemonCardId: card.pokemonCardId,
    pokemonPriceVariant: card.pokemonPriceVariant,
  };
}

export function applyOcr(draft: CardDraft, parsed: Partial<CardDraft>): CardDraft {
  const next: CardDraft = { ...draft };
  const keys = ['name', 'year', 'setName', 'cardNumber', 'brand', 'conditionNote', 'grade'] as const;
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim() && !next[key].trim()) next[key] = value.trim();
  }
  if (parsed.category && parsed.category !== 'Other' && next.category === 'Other') {
    next.category = parsed.category;
  }
  if (
    parsed.conditionType === 'graded' &&
    next.conditionType === 'raw' &&
    !next.conditionNote.trim() &&
    !next.grade.trim()
  ) {
    next.conditionType = 'graded';
    if (parsed.gradeCompany && !next.gradeCompany) next.gradeCompany = parsed.gradeCompany;
    if (parsed.grade && !next.grade) next.grade = parsed.grade;
  }
  return next;
}

export function ocrFoundSomething(parsed: Partial<CardDraft>): boolean {
  return Boolean(
    parsed.name ||
      parsed.year ||
      parsed.cardNumber ||
      parsed.setName ||
      parsed.brand ||
      (parsed.category && parsed.category !== 'Other') ||
      parsed.conditionType === 'graded',
  );
}

export function cleanDraft(draft: CardDraft): CardDraft {
  const next: CardDraft = {
    ...draft,
    name: draft.name.trim(),
    year: draft.year.trim(),
    setName: draft.setName.trim(),
    cardNumber: draft.cardNumber.trim(),
    brand: draft.brand.trim(),
    conditionNote: draft.conditionNote.trim(),
    grade: draft.grade.trim(),
    location: draft.location.trim(),
    notes: draft.notes.trim(),
  };
  if (next.conditionType === 'raw') {
    next.gradeCompany = '';
    next.grade = '';
  }
  return next;
}

export function validateDraft(draft: CardDraft): string | null {
  if (!draft.name.trim()) return 'Add a name so you can find this card.';
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 999) {
    return 'Quantity should be from 1 to 999.';
  }
  if (draft.conditionType === 'graded' && !draft.gradeCompany) {
    return 'Pick PSA, BGS, SGC, or CGC, or switch this card to raw.';
  }
  if (draft.conditionType === 'graded' && !draft.grade.trim()) {
    return 'Add the grade, like 10 or 9.5.';
  }
  return null;
}
