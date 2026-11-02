const DAY = 24 * 60 * 60 * 1000;

export const STALE_VALUE_MS = 30 * DAY;
export const BACKUP_DUE_MS = 14 * DAY;

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return 'Unknown date';
  return dateFormat.format(time);
}

export function isValueStale(valueUpdatedAt: string | null, hasValue: boolean, now = Date.now()): boolean {
  if (!hasValue) return false;
  if (!valueUpdatedAt) return true;
  const time = Date.parse(valueUpdatedAt);
  if (Number.isNaN(time)) return true;
  return now - time > STALE_VALUE_MS;
}

export function isBackupDue(lastBackupAt: string | null, now = Date.now()): boolean {
  if (!lastBackupAt) return true;
  const time = Date.parse(lastBackupAt);
  if (Number.isNaN(time)) return true;
  return now - time > BACKUP_DUE_MS;
}

export function datedFileStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
