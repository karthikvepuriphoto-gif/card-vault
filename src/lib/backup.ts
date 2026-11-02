import type { CardRecord, Category, ConditionType, GradeCompany, ValueSource } from '../types';
import { isCategory, isGradeCompany } from '../types';

export const BACKUP_APP = 'card-vault';
export const BACKUP_VERSION = 1;

export interface BackupCard {
  id: string;
  name: string;
  year: string;
  setName: string;
  cardNumber: string;
  brand: string;
  category: Category;
  conditionType: ConditionType;
  conditionNote: string;
  gradeCompany: GradeCompany | '';
  grade: string;
  quantity: number;
  purchasePrice: number | null;
  currentValue: number | null;
  valueUpdatedAt: string | null;
  valueSource: ValueSource | '';
  location: string;
  notes: string;
  favourite: boolean;
  pokemonCardId: string | null;
  pokemonPriceVariant: string | null;
  createdAt: string;
  updatedAt: string;
  frontImage: string | null;
  backImage: string | null;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  cards: BackupCard[];
}

export interface ImportedCard {
  record: CardRecord;
  frontImage: Blob | null;
  backImage: Blob | null;
}

export type ParsedBackup =
  | { ok: true; exportedAt: string; cards: ImportedCard[]; skipped: number }
  | { ok: false; error: string };

const MAX_IMAGE_BYTES = 4_000_000;

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  const type = blob.type || 'image/jpeg';
  return `data:${type};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Bad image');
  const mime = match[1] || 'application/octet-stream';
  const encoded = match[3] ?? '';
  if (match[2]) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(encoded)], { type: mime });
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function money(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000_000) return null;
  return Math.round(value * 100) / 100;
}

function timestamp(value: unknown, fallback: string | null): string | null {
  if (typeof value !== 'string') return fallback;
  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

function imageFromField(value: unknown): Blob | null {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return null;
  try {
    const blob = dataUrlToBlob(value);
    if (blob.size > MAX_IMAGE_BYTES) return null;
    return blob;
  } catch {
    return null;
  }
}

function cardShell(raw: Record<string, unknown>, now: string): CardRecord | null {
  const id = text(raw.id, 80);
  const name = text(raw.name, 80);
  if (!id || !name) return null;
  const categoryText = text(raw.category, 40);
  const companyText = text(raw.gradeCompany, 8).toUpperCase();
  const condition = raw.conditionType === 'graded' ? 'graded' : 'raw';
  const source = raw.valueSource === 'tcgplayer' || raw.valueSource === 'ebay' || raw.valueSource === 'manual' ? raw.valueSource : '';
  const quantity = typeof raw.quantity === 'number' && Number.isInteger(raw.quantity) ? Math.min(999, Math.max(1, raw.quantity)) : 1;
  return {
    id,
    name,
    year: text(raw.year, 12),
    setName: text(raw.setName, 80),
    cardNumber: text(raw.cardNumber, 24),
    brand: text(raw.brand, 40),
    category: isCategory(categoryText) ? categoryText : 'Other',
    conditionType: condition,
    conditionNote: text(raw.conditionNote, 200),
    gradeCompany: isGradeCompany(companyText) ? companyText : '',
    grade: text(raw.grade, 8),
    quantity,
    purchasePrice: money(raw.purchasePrice),
    currentValue: money(raw.currentValue),
    valueUpdatedAt: timestamp(raw.valueUpdatedAt, null),
    valueSource: source,
    location: text(raw.location, 80),
    notes: text(raw.notes, 2000),
    favourite: raw.favourite === true,
    frontImageId: null,
    backImageId: null,
    pokemonCardId: text(raw.pokemonCardId, 80) || null,
    pokemonPriceVariant: text(raw.pokemonPriceVariant, 40) || null,
    createdAt: timestamp(raw.createdAt, now) ?? now,
    updatedAt: timestamp(raw.updatedAt, now) ?? now,
  };
}

export function backupCardFromRecord(card: CardRecord, frontImage: string | null, backImage: string | null): BackupCard {
  return {
    id: card.id,
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
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    frontImage,
    backImage,
  };
}

export function parseBackup(textValue: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(textValue.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, error: "That file isn't a Card Vault backup." };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: "That file isn't a Card Vault backup." };
  const record = data as Record<string, unknown>;
  if (record.app !== BACKUP_APP) return { ok: false, error: "That file isn't a Card Vault backup." };
  if (record.version !== BACKUP_VERSION) {
    return { ok: false, error: 'This backup is from a newer Card Vault. Update the app, then try again.' };
  }
  if (!Array.isArray(record.cards)) return { ok: false, error: 'That backup is missing the card list.' };
  const now = new Date().toISOString();
  const cards: ImportedCard[] = [];
  let skipped = 0;
  for (const item of record.cards) {
    if (!item || typeof item !== 'object') {
      skipped += 1;
      continue;
    }
    const raw = item as Record<string, unknown>;
    const shell = cardShell(raw, now);
    if (!shell) {
      skipped += 1;
      continue;
    }
    cards.push({
      record: shell,
      frontImage: imageFromField(raw.frontImage),
      backImage: imageFromField(raw.backImage),
    });
  }
  return {
    ok: true,
    exportedAt: timestamp(record.exportedAt, now) ?? now,
    cards,
    skipped,
  };
}

export function mergeCardRecords(existing: CardRecord[], incoming: CardRecord[]): CardRecord[] {
  const map = new Map(existing.map((card) => [card.id, card]));
  for (const card of incoming) map.set(card.id, card);
  return [...map.values()];
}
