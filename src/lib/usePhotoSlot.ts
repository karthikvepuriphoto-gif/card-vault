import { useEffect, useState } from 'react';
import { compressImage } from './images';
import { useImageUrl } from './useImageUrl';

export function usePhotoSlot(existingId: string | null) {
  const existingUrl = useImageUrl(existingId);
  const [boundId, setBoundId] = useState(existingId);
  const [change, setChange] = useState<Blob | null | undefined>(undefined);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (boundId !== existingId) {
    setBoundId(existingId);
    setChange(undefined);
    setError(null);
  }

  useEffect(() => {
    if (!(change instanceof Blob)) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(change);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [change]);

  const url = change === undefined ? existingUrl : change === null ? null : localUrl;

  return {
    url,
    change,
    error,
    async pick(file: File) {
      try {
        setChange(await compressImage(file));
        setError(null);
      } catch {
        setError("That photo couldn't be opened. Try another one.");
      }
    },
    clear() {
      setChange(null);
      setError(null);
    },
    reset() {
      setChange(undefined);
      setError(null);
    },
  };
}
