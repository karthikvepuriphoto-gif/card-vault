import { useRef } from 'react';

export function PhotoSlot({
  label,
  alt,
  url,
  error,
  large,
  onFile,
  onClear,
}: {
  label: string;
  alt: string;
  url: string | null;
  error?: string | null;
  large?: boolean;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function take(list: FileList | null, input: HTMLInputElement) {
    const file = list?.[0];
    input.value = '';
    if (file) onFile(file);
  }

  return (
    <div className={large ? 'photo-slot large' : 'photo-slot'}>
      <p className="slot-label">{label}</p>
      <div className="photo-frame">
        {url ? <img src={url} alt={alt} /> : <span className="photo-empty">No photo yet</span>}
      </div>
      <div className="action-row pair">
        <button type="button" className="btn ghost" onClick={() => cameraRef.current?.click()}>
          Take photo
        </button>
        <button type="button" className="btn ghost" onClick={() => libraryRef.current?.click()}>
          Photo library
        </button>
      </div>
      {url && onClear ? (
        <button type="button" className="text-btn" onClick={onClear}>
          Remove photo
        </button>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          if (event.target instanceof HTMLInputElement) take(event.target.files, event.target);
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          if (event.target instanceof HTMLInputElement) take(event.target.files, event.target);
        }}
      />
    </div>
  );
}
