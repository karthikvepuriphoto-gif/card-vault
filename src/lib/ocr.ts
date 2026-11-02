import { prepareForOcr } from './images';

type OcrWorker = import('tesseract.js').Worker;

let workerPromise: Promise<OcrWorker> | null = null;
let readToken = 0;
let progressOffset = 0;
let progressSpan = 1;
let progressListener: ((value: number) => void) | null = null;

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const tesseract = await import('tesseract.js');
      const createWorker = tesseract.createWorker ?? tesseract.default?.createWorker;
      if (!createWorker) throw new Error('OCR reader failed to load');
      const worker = await createWorker('eng', 1, {
        logger: (message) => {
          if (message.status === 'recognizing text' && progressListener) {
            progressListener(Math.min(1, progressOffset + message.progress * progressSpan));
          }
        },
      });
      await worker.setParameters({ user_defined_dpi: '300' });
      return worker;
    })().catch((err: unknown) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export function cancelRecognize(): void {
  readToken += 1;
}

function friendlyOcrError(): Error {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Error('Photo reading needs a connection the first time so it can download the reader. You can still type the card in.');
  }
  return new Error("Couldn't read that photo. You can still type the card in.");
}

async function safePrepare(blob: Blob): Promise<Blob> {
  try {
    return await prepareForOcr(blob);
  } catch {
    return blob;
  }
}

export async function recognizeCards(
  blobs: Blob[],
  onProgress: (value: number) => void,
): Promise<{ text: string; cancelled: boolean }> {
  if (blobs.length === 0) return { text: '', cancelled: false };
  const token = ++readToken;
  progressListener = onProgress;
  let worker: OcrWorker;
  try {
    onProgress(0.02);
    worker = await getWorker();
  } catch (err) {
    console.error('Card Vault OCR failed to start', err);
    throw friendlyOcrError();
  }
  if (token !== readToken) return { text: '', cancelled: true };
  const parts: string[] = [];
  try {
    for (let index = 0; index < blobs.length; index += 1) {
      if (token !== readToken) return { text: '', cancelled: true };
      progressOffset = index / blobs.length;
      progressSpan = 1 / blobs.length;
      const source = blobs[index];
      if (!source) continue;
      const prepared = await safePrepare(source);
      if (token !== readToken) return { text: '', cancelled: true };
      const result = await worker.recognize(prepared);
      if (token !== readToken) return { text: '', cancelled: true };
      parts.push(result.data.text ?? '');
      onProgress((index + 1) / blobs.length);
    }
  } catch (err) {
    console.error('Card Vault OCR failed', err);
    throw friendlyOcrError();
  }
  return { text: parts.join('\n'), cancelled: false };
}
