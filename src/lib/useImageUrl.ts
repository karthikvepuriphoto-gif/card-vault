import { useEffect, useState } from 'react';
import { cachedImageUrl, rememberImageUrl } from './imageCache';
import { getImageBlob } from './storage';

export function useImageUrl(id: string | null): string | null {
  const [state, setState] = useState<{ id: string | null; url: string | null; done: boolean }>(() => {
    const cached = id ? cachedImageUrl(id) ?? null : null;
    return { id, url: cached, done: !id || cached != null };
  });

  if (state.id !== id) {
    const cached = id ? cachedImageUrl(id) ?? null : null;
    setState({ id, url: cached, done: !id || cached != null });
  }

  useEffect(() => {
    if (!id || state.done) return;
    let cancelled = false;
    getImageBlob(id)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setState({ id, url: null, done: true });
          return;
        }
        const url = URL.createObjectURL(blob);
        rememberImageUrl(id, url);
        setState({ id, url, done: true });
      })
      .catch(() => {
        if (!cancelled) setState({ id, url: null, done: true });
      });
    return () => {
      cancelled = true;
    };
  }, [id, state.done]);

  return state.id === id ? state.url : null;
}
