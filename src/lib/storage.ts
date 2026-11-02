import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardDraft, CardRecord } from '../types';
import { backupCardFromRecord, blobToDataUrl, type ParsedBackup } from './backup';
import { createId } from './id';
import { forgetAllImageUrls, forgetImageUrl } from './imageCache';
import { compressImage } from './images';

const DB_NAME = 'card-vault';
const DB_VERSION = 1;

export const META = {
  lastBackup: 'lastBackupAt',
  installHint: 'installHintDismissed',
} as const;

interface ImageRecord {
  id: string;
  blob: Blob;
}

interface MetaRecord {
  key: string;
  value: string;
}

interface CardVaultDB extends DBSchema {
  cards: { key: string; value: CardRecord };
  images: { key: string; value: ImageRecord };
  meta: { key: string; value: MetaRecord };
}

let dbPromise: Promise<IDBPDatabase<CardVaultDB>> | null = null;

function database(): Promise<IDBPDatabase<CardVaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CardVaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('cards', { keyPath: 'id' });
        db.createObjectStore('images', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    }).catch((err: unknown) => {
      dbPromise = null;
      console.error('Card Vault storage failed', err);
      throw new Error(
        "Card Vault couldn't open storage on this device. If this is a private tab, open Card Vault in a normal Safari tab and try again.",
      );
    });
  }
  return dbPromise;
}

function isQuota(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

async function storeBlob(blob: Blob): Promise<string> {
  let stored = blob;
  try {
    stored = await compressImage(blob);
  } catch {
    if (blob.size > 3_000_000) {
      throw new Error("That photo is too big to store, and it couldn't be resized. Try another photo.");
    }
  }
  const id = createId();
  const db = await database();
  try {
    await db.put('images', { id, blob: stored });
  } catch (err) {
    if (isQuota(err)) {
      throw new Error(
        'This device is out of room for more photos. Back up the collection, then remove a few pictures, or save this card without a photo.',
      );
    }
    throw err;
  }
  return id;
}

function withCleanName(draft: CardDraft, base: Pick<CardRecord, 'id' | 'frontImageId' | 'backImageId' | 'createdAt' | 'updatedAt'>): CardRecord {
  const name = draft.name.trim();
  if (!name) throw new Error('Add a name so you can find this card.');
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 999) {
    throw new Error('Quantity should be from 1 to 999.');
  }
  return {
    ...draft,
    name,
    id: base.id,
    frontImageId: base.frontImageId,
    backImageId: base.backImageId,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
}

export async function listCards(): Promise<CardRecord[]> {
  const db = await database();
  const cards = await db.getAll('cards');
  return cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await database();
  const row = await db.get('meta', key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await database();
  await db.put('meta', { key, value });
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const db = await database();
  const row = await db.get('images', id);
  return row?.blob ?? null;
}

export async function createCard(draft: CardDraft, images: { front: Blob | null; back: Blob | null }): Promise<CardRecord> {
  const now = new Date().toISOString();
  const frontImageId = images.front ? await storeBlob(images.front) : null;
  const backImageId = images.back ? await storeBlob(images.back) : null;
  const card = withCleanName(draft, {
    id: createId(),
    frontImageId,
    backImageId,
    createdAt: now,
    updatedAt: now,
  });
  const db = await database();
  await db.put('cards', card);
  return card;
}

export async function updateCard(id: string, patch: Partial<CardDraft>): Promise<CardRecord> {
  const db = await database();
  const existing = await db.get('cards', id);
  if (!existing) throw new Error('That card is no longer on this device.');
  const next = withCleanName(
    { ...existing, ...patch },
    { ...existing, updatedAt: new Date().toISOString() },
  );
  await db.put('cards', next);
  return next;
}

export async function saveCardEdits(
  id: string,
  draft: CardDraft,
  images: { front?: Blob | null; back?: Blob | null },
): Promise<CardRecord> {
  const db = await database();
  const existing = await db.get('cards', id);
  if (!existing) throw new Error('That card is no longer on this device.');
  let frontImageId = existing.frontImageId;
  let backImageId = existing.backImageId;
  const remove: string[] = [];
  if (images.front !== undefined) {
    if (existing.frontImageId) remove.push(existing.frontImageId);
    frontImageId = images.front ? await storeBlob(images.front) : null;
  }
  if (images.back !== undefined) {
    if (existing.backImageId) remove.push(existing.backImageId);
    backImageId = images.back ? await storeBlob(images.back) : null;
  }
  const next = withCleanName(draft, {
    id,
    frontImageId,
    backImageId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  await db.put('cards', next);
  for (const imageId of remove) {
    await db.delete('images', imageId);
    forgetImageUrl(imageId);
  }
  return next;
}

export async function deleteCard(id: string): Promise<void> {
  const db = await database();
  const existing = await db.get('cards', id);
  if (!existing) return;
  await db.delete('cards', id);
  for (const imageId of [existing.frontImageId, existing.backImageId]) {
    if (!imageId) continue;
    await db.delete('images', imageId);
    forgetImageUrl(imageId);
  }
}

export async function exportBackupBlob(): Promise<Blob> {
  const db = await database();
  const cards = await db.getAll('cards');
  const payloadCards = [];
  for (const card of cards) {
    const front = card.frontImageId ? await db.get('images', card.frontImageId) : undefined;
    const back = card.backImageId ? await db.get('images', card.backImageId) : undefined;
    payloadCards.push(
      backupCardFromRecord(
        card,
        front ? await blobToDataUrl(front.blob) : null,
        back ? await blobToDataUrl(back.blob) : null,
      ),
    );
  }
  const file = {
    app: 'card-vault' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    cards: payloadCards,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function restoreBackup(parsed: Extract<ParsedBackup, { ok: true }>, mode: 'merge' | 'replace'): Promise<void> {
  const db = await database();
  const tx = db.transaction(['cards', 'images'], 'readwrite');
  const cardStore = tx.objectStore('cards');
  const imageStore = tx.objectStore('images');
  const existing = mode === 'merge' ? await cardStore.getAll() : [];
  const existingById = new Map(existing.map((card) => [card.id, card]));
  if (mode === 'replace') {
    await cardStore.clear();
    await imageStore.clear();
  }
  const removedImages: string[] = [];
  for (const item of parsed.cards) {
    const previous = existingById.get(item.record.id);
    const frontImageId = await putImportedImage(imageStore, item.frontImage);
    const backImageId = await putImportedImage(imageStore, item.backImage);
    if (previous?.frontImageId) removedImages.push(previous.frontImageId);
    if (previous?.backImageId) removedImages.push(previous.backImageId);
    await cardStore.put({ ...item.record, frontImageId, backImageId });
  }
  if (mode === 'merge') {
    for (const imageId of removedImages) await imageStore.delete(imageId);
  }
  await tx.done;
  forgetAllImageUrls();
}

async function putImportedImage(
  store: { put: (value: ImageRecord) => Promise<IDBValidKey> },
  blob: Blob | null,
): Promise<string | null> {
  if (!blob) return null;
  const id = createId();
  await store.put({ id, blob });
  return id;
}
