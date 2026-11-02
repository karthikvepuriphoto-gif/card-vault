import { useCallback, useRef, useState } from 'react';
import { useBlocker, useNavigate, type BlockerFunction } from 'react-router-dom';
import { useCollection } from '../collection';
import { CardForm } from '../components/CardForm';
import { PriceDock } from '../components/EbaySoldLink';
import { Modal } from '../components/Modal';
import { PhotoSlot } from '../components/PhotoSlot';
import { applyOcr, emptyDraft, ocrFoundSomething } from '../lib/draft';
import { cancelRecognize, recognizeCards } from '../lib/ocr';
import { parseCardText } from '../lib/parseCardText';
import { usePhotoSlot } from '../lib/usePhotoSlot';
import type { CardDraft } from '../types';

export function AddPage() {
  const navigate = useNavigate();
  const { addCard, cards } = useCollection();
  const front = usePhotoSlot(null);
  const back = usePhotoSlot(null);
  const [stage, setStage] = useState<'capture' | 'reading' | 'review'>('capture');
  const [draft, setDraft] = useState<CardDraft>(() => emptyDraft());
  const [progress, setProgress] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(false);
  const request = useRef(0);
  const dirtyRef = useRef(false);
  dirtyRef.current = Boolean(front.url || back.url || draft.name.trim());
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      !saved.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);
  const locations = [...new Set(cards.map((card) => card.location.trim()).filter(Boolean))].sort();

  async function readPhotos(fromReview = false) {
    const blobs = [front.change, back.change].filter((blob): blob is Blob => blob instanceof Blob);
    if (blobs.length === 0) {
      setBanner('Type this card in. You can add a photo whenever you want.');
      setStage('review');
      return;
    }
    const id = ++request.current;
    if (!fromReview) setStage('reading');
    setReading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await recognizeCards(blobs, (value) => {
        if (request.current === id) setProgress(value);
      });
      if (request.current !== id || result.cancelled) return;
      const parsed = parseCardText(result.text);
      setDraft((current) => applyOcr(current, parsed));
      setBanner(
        ocrFoundSomething(parsed)
          ? "We filled in what the photo seemed to say. Fix anything that's off, then save."
          : "We couldn't find a name or number in the photo. Type them in below.",
      );
      setStage('review');
    } catch (err) {
      if (request.current !== id) return;
      setBanner(err instanceof Error ? err.message : "Couldn't read that photo. You can still type the card in.");
      setStage('review');
    } finally {
      if (request.current === id) setReading(false);
    }
  }

  function skipReading() {
    request.current += 1;
    cancelRecognize();
    setReading(false);
    setBanner('Skipped photo reading. Type the card in below.');
    setStage('review');
  }

  async function save(next: CardDraft) {
    setBusy(true);
    setError(null);
    try {
      const card = await addCard(next, {
        front: front.change instanceof Blob ? front.change : null,
        back: back.change instanceof Blob ? back.change : null,
      });
      saved.current = true;
      navigate(`/card/${card.id}`, { state: { justSaved: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that card. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="stack has-dock">
      {stage === 'capture' ? (
        <section className="capture">
          <h1>Add a card</h1>
          <p>Photograph the front. The back is optional. We'll try to read the words, then you can fix them. Photos stay on this iPad.</p>
          <div className="action-row pair">
            <PhotoSlot
              large
              label="Front of the card"
              alt="Front of the card"
              url={front.url}
              error={front.error}
              onFile={(file) => void front.pick(file)}
              onClear={front.url ? front.clear : undefined}
            />
            <PhotoSlot
              large
              label="Back of the card"
              alt="Back of the card"
              url={back.url}
              error={back.error}
              onFile={(file) => void back.pick(file)}
              onClear={back.url ? back.clear : undefined}
            />
          </div>
          {front.url || back.url ? (
            <button type="button" className="btn primary full" onClick={() => void readPhotos(false)}>
              Read the card
            </button>
          ) : null}
          <button
            type="button"
            className={front.url || back.url ? 'btn ghost full' : 'btn primary full'}
            onClick={() => {
              setBanner(front.url || back.url ? null : 'Type this card in. You can add a photo whenever you want.');
              setStage('review');
            }}
          >
            {front.url || back.url ? 'Type it in instead' : 'Type it in'}
          </button>
        </section>
      ) : null}
      {stage === 'reading' ? (
        <section className="capture">
          <h1>Reading the card…</h1>
          <progress value={progress > 0 ? progress : undefined} max={1} />
          <p>This stays on the iPad. The first read can take a moment while the reader downloads.</p>
          <button type="button" className="btn ghost" onClick={skipReading}>
            Skip and type it in
          </button>
        </section>
      ) : null}
      {stage === 'review' ? (
        <section className="stack">
          <div className="section-head">
            <h1>Check this card</h1>
            <button type="button" className="btn ghost small" onClick={() => setStage('capture')}>
              Photos
            </button>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <CardForm
            draft={draft}
            onChange={setDraft}
            onSubmit={(next) => void save(next)}
            locations={locations}
            frontUrl={front.url}
            backUrl={back.url}
            frontError={front.error}
            backError={back.error}
            onFrontFile={(file) => void front.pick(file)}
            onBackFile={(file) => void back.pick(file)}
            onClearFront={front.clear}
            onClearBack={back.clear}
            onReadPhoto={() => void readPhotos(true)}
            reading={reading}
            readProgress={progress}
            banner={banner}
            submitLabel="Save card"
            busy={busy || reading}
          />
        </section>
      ) : null}
      {stage !== 'review' ? <PriceDock card={draft} /> : null}
      {blocker.state === 'blocked' ? (
        <Modal title="Leave without saving?" onClose={() => blocker.reset()}>
          <p>This card isn't saved on the iPad yet.</p>
          <div className="action-row pair">
            <button type="button" className="btn danger" onClick={() => blocker.proceed()}>
              Leave
            </button>
            <button type="button" className="btn primary" onClick={() => blocker.reset()}>
              Keep editing
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
