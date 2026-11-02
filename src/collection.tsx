import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CardDraft, CardRecord } from './types';
import type { ParsedBackup } from './lib/backup';
import { buildCsv } from './lib/csv';
import { datedFileStamp } from './lib/dates';
import { isShareCancel, shareOrDownload, type ShareResult } from './lib/share';
import {
  META,
  createCard,
  deleteCard,
  exportBackupBlob,
  getMeta,
  listCards,
  restoreBackup,
  saveCardEdits,
  setMeta,
  updateCard,
} from './lib/storage';

interface CollectionValue {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  cards: CardRecord[];
  lastBackupAt: string | null;
  installHintDismissed: boolean;
  reload: () => Promise<void>;
  addCard: (draft: CardDraft, images: { front: Blob | null; back: Blob | null }) => Promise<CardRecord>;
  editCard: (id: string, draft: CardDraft, images: { front?: Blob | null; back?: Blob | null }) => Promise<void>;
  patchCard: (id: string, patch: Partial<CardDraft>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  dismissInstallHint: () => Promise<void>;
  restore: (parsed: Extract<ParsedBackup, { ok: true }>, mode: 'merge' | 'replace') => Promise<void>;
  makeBackup: () => Promise<ShareResult>;
  makeCsv: () => Promise<ShareResult>;
}

const CollectionContext = createContext<CollectionValue | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [installHintDismissed, setInstallHintDismissed] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [nextCards, backup, hint] = await Promise.all([
        listCards(),
        getMeta(META.lastBackup),
        getMeta(META.installHint),
      ]);
      setCards(nextCards);
      setLastBackupAt(backup);
      setInstallHintDismissed(hint === '1');
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('Card Vault storage failed', err);
      setError(err instanceof Error ? err.message : "Card Vault couldn't open storage on this device.");
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addCard = useCallback(
    async (draft: CardDraft, images: { front: Blob | null; back: Blob | null }) => {
      const card = await createCard(draft, images);
      await reload();
      return card;
    },
    [reload],
  );

  const editCard = useCallback(
    async (id: string, draft: CardDraft, images: { front?: Blob | null; back?: Blob | null }) => {
      await saveCardEdits(id, draft, images);
      await reload();
    },
    [reload],
  );

  const patchCard = useCallback(
    async (id: string, patch: Partial<CardDraft>) => {
      await updateCard(id, patch);
      await reload();
    },
    [reload],
  );

  const removeCard = useCallback(
    async (id: string) => {
      await deleteCard(id);
      await reload();
    },
    [reload],
  );

  const dismissInstallHint = useCallback(async () => {
    await setMeta(META.installHint, '1');
    setInstallHintDismissed(true);
  }, []);

  const restore = useCallback(
    async (parsed: Extract<ParsedBackup, { ok: true }>, mode: 'merge' | 'replace') => {
      await restoreBackup(parsed, mode);
      await reload();
    },
    [reload],
  );

  const makeBackup = useCallback(async () => {
    const blob = await exportBackupBlob();
    try {
      const result = await shareOrDownload(`card-vault-${datedFileStamp()}.json`, blob, 'application/json');
      const stamp = new Date().toISOString();
      await setMeta(META.lastBackup, stamp);
      setLastBackupAt(stamp);
      return result;
    } catch (err) {
      if (isShareCancel(err)) throw err;
      throw err;
    }
  }, []);

  const makeCsv = useCallback(async () => {
    const blob = new Blob([`\uFEFF${buildCsv(cards)}`], { type: 'text/csv;charset=utf-8' });
    return shareOrDownload(`card-vault-${datedFileStamp()}.csv`, blob, 'text/csv');
  }, [cards]);

  const value = useMemo<CollectionValue>(
    () => ({
      status,
      error,
      cards,
      lastBackupAt,
      installHintDismissed,
      reload,
      addCard,
      editCard,
      patchCard,
      removeCard,
      dismissInstallHint,
      restore,
      makeBackup,
      makeCsv,
    }),
    [
      status,
      error,
      cards,
      lastBackupAt,
      installHintDismissed,
      reload,
      addCard,
      editCard,
      patchCard,
      removeCard,
      dismissInstallHint,
      restore,
      makeBackup,
      makeCsv,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionValue {
  const value = useContext(CollectionContext);
  if (!value) throw new Error('useCollection must be used inside CollectionProvider');
  return value;
}
