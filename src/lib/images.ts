const MAX_EDGE = 1600;
const QUALITY = 0.75;

async function bitmapFrom(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(blob);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not resize the photo'))), type, quality);
  });
}

export async function compressImage(blob: Blob, maxEdge = MAX_EDGE, quality = QUALITY): Promise<Blob> {
  const bitmap = await bitmapFrom(blob);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not resize the photo');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    return await canvasBlob(canvas, 'image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

export async function prepareForOcr(blob: Blob): Promise<Blob> {
  const bitmap = await bitmapFrom(blob);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const data = image.data;
    const contrast = 1.35;
    for (let index = 0; index < data.length; index += 4) {
      const gray = (data[index] ?? 0) * 0.299 + (data[index + 1] ?? 0) * 0.587 + (data[index + 2] ?? 0) * 0.114;
      const value = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
    }
    context.putImageData(image, 0, 0);
    return await canvasBlob(canvas, 'image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}
