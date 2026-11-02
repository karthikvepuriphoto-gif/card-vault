import { useState } from 'react';
import { useCollection } from '../collection';
import { Modal } from '../components/Modal';
import { parseBackup, type ParsedBackup } from '../lib/backup';
import { formatDate } from '../lib/dates';
import { isShareCancel } from '../lib/share';

export function BackupPage() {
  const { cards, lastBackupAt, makeBackup, makeCsv, restore } = useCollection();
  const [pending, setPending] = useState<Extract<ParsedBackup, { ok: true }> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'backup' | 'csv' | 'restore' | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  async function onBackup() {
    setBusy('backup');
    setError(null);
    setMessage(null);
    try {
      const result = await makeBackup();
      setMessage(
        result === 'shared'
          ? 'Backup ready. In the share sheet, choose Save to Files, then iCloud Drive.'
          : 'Backup downloaded. On iPad, move it from Downloads into iCloud Drive so it is safe.',
      );
    } catch (err) {
      if (!isShareCancel(err)) setError(err instanceof Error ? err.message : "Couldn't make the backup.");
    } finally {
      setBusy(null);
    }
  }

  async function onCsv() {
    setBusy('csv');
    setError(null);
    setMessage(null);
    try {
      await makeCsv();
      setMessage("Spreadsheet ready. It does not include photos — use Back up for those.");
    } catch (err) {
      if (!isShareCancel(err)) setError(err instanceof Error ? err.message : "Couldn't export the spreadsheet.");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file: File) {
    setError(null);
    setMessage(null);
    setPending(null);
    if (file.size > 150 * 1024 * 1024) {
      setError('That file is too big to restore on this device.');
      return;
    }
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.cards.length === 0) {
      setError(parsed.skipped > 0 ? "That backup didn't include any cards we could read." : 'That backup has no cards.');
      return;
    }
    setPending(parsed);
  }

  async function runRestore(mode: 'merge' | 'replace') {
    if (!pending) return;
    setBusy('restore');
    setError(null);
    try {
      await restore(pending, mode);
      const skipped = pending.skipped > 0 ? ` ${pending.skipped} could not be read and were skipped.` : '';
      setMessage(`Restore finished. The collection on this iPad is updated.${skipped}`);
      setPending(null);
      setConfirmReplace(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't restore that backup.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack backup">
      <h1>Back up</h1>
      <p>
        Cards stay on this iPad. A backup is one file you can save to iCloud Drive with the share sheet. There is no account and nothing is uploaded by Card Vault.
      </p>
      <p className="hint">{lastBackupAt ? `Last backup: ${formatDate(lastBackupAt)}` : 'No backup yet.'}</p>
      {message ? (
        <p className="banner info" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <section className="price-card">
        <h2>Save a copy</h2>
        <button type="button" className="btn primary" disabled={busy != null || cards.length === 0} onClick={() => void onBackup()}>
          {busy === 'backup' ? 'Preparing backup…' : 'Back up'}
        </button>
        {cards.length === 0 ? <p className="hint">Add a card before making a backup. You can still restore one below.</p> : null}
        <p className="hint">On iPad, choose Save to Files, then iCloud Drive. The file includes the photos.</p>
        <button type="button" className="btn ghost" disabled={busy != null || cards.length === 0} onClick={() => void onCsv()}>
          {busy === 'csv' ? 'Preparing spreadsheet…' : 'Export spreadsheet (CSV)'}
        </button>
      </section>
      <section className="price-card">
        <h2>Restore</h2>
        <p>Choose a Card Vault backup file. Merge adds it to this iPad. Replace swaps the whole collection for the file.</p>
        <label className="btn ghost">
          Choose a backup file
          <input
            type="file"
            accept=".json,application/json,text/plain"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void onFile(file);
            }}
          />
        </label>
        {pending ? (
          <div className="stack tight">
            <p>
              Backup from {formatDate(pending.exportedAt)} · {pending.cards.length === 1 ? '1 card' : `${pending.cards.length} cards`}
              {pending.skipped > 0 ? ` · ${pending.skipped} skipped` : ''}
            </p>
            <div className="action-row pair">
              <button type="button" className="btn primary" disabled={busy != null} onClick={() => void runRestore('merge')}>
                Merge
              </button>
              <button type="button" className="btn danger" disabled={busy != null} onClick={() => setConfirmReplace(true)}>
                Replace
              </button>
            </div>
            <p className="hint">Merge keeps cards already on this iPad. If a card has the same id, the file's copy wins.</p>
          </div>
        ) : null}
      </section>
      {confirmReplace ? (
        <Modal title="Replace the whole collection?" onClose={() => setConfirmReplace(false)}>
          <p>Cards on this iPad that aren't in the file will be deleted. This can't be undone unless you have another backup.</p>
          <div className="action-row pair">
            <button type="button" className="btn danger" disabled={busy != null} onClick={() => void runRestore('replace')}>
              {busy === 'restore' ? 'Replacing…' : 'Replace collection'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirmReplace(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
