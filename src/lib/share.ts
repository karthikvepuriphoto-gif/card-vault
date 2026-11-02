export type ShareResult = 'shared' | 'downloaded';

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function shareOrDownload(filename: string, blob: Blob, mime: string): Promise<ShareResult> {
  const files = [new File([blob], filename, { type: mime }), new File([blob], filename, { type: 'text/plain' })];
  for (const file of files) {
    if (!canShareFile(file)) continue;
    try {
      await navigator.share({ files: [file], title: 'Card Vault' });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }
  downloadBlob(filename, blob);
  return 'downloaded';
}

export function isShareCancel(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
