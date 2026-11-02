const urls = new Map<string, string>();

export function cachedImageUrl(id: string): string | undefined {
  return urls.get(id);
}

export function rememberImageUrl(id: string, url: string): void {
  const previous = urls.get(id);
  if (previous && previous !== url) URL.revokeObjectURL(previous);
  urls.set(id, url);
}

export function forgetImageUrl(id: string): void {
  const previous = urls.get(id);
  if (previous) URL.revokeObjectURL(previous);
  urls.delete(id);
}

export function forgetAllImageUrls(): void {
  for (const id of [...urls.keys()]) forgetImageUrl(id);
}
