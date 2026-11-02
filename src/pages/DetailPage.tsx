import { useCallback, useRef, useState } from 'react';
import { Link, useBlocker, useLocation, useNavigate, useParams, type BlockerFunction } from 'react-router-dom';
import { useCollection } from '../collection';
import { CardForm } from '../components/CardForm';
import { Modal } from '../components/Modal';
import { PricePanel } from '../components/PricePanel';
import { StarIcon } from '../components/Icons';
import { CATEGORY_COLOR } from '../lib/categories';
import { draftFromCard } from '../lib/draft';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { useImageUrl } from '../lib/useImageUrl';
import { usePhotoSlot } from '../lib/usePhotoSlot';
import type { CardDraft, CardRecord } from '../types';

export function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { cards, patchCard, editCard, removeCard } = useCollection();
  const card = cards.find((item) => item.id === id) ?? null;
  if (!card) {
    return (
      <div className="empty">
        <h1>That card isn't on this iPad</h1>
        <Link to="/" className="btn primary">
          Back to the collection
        </Link>
      </div>
    );
  }
  return (
    <DetailBody
      card={card}
      justSaved={justSavedFrom(location.state)}
      locations={[...new Set(cards.map((item) => item.location.trim()).filter(Boolean))].sort()}
      onPatch={(patch) => patchCard(card.id, patch)}
      onEdit={(draft, images) => editCard(card.id, draft, images)}
      onDelete={async () => {
        await removeCard(card.id);
        navigate('/');
      }}
    />
  );
}

function cardSummary(card: CardRecord): string {
  const parts: string[] = [];
  if (card.year) parts.push(card.year);
  const brand = card.brand.trim();
  const setName = card.setName.trim();
  if (brand && !setName.toLowerCase().includes(brand.toLowerCase())) parts.push(brand);
  if (setName) parts.push(setName);
  if (card.cardNumber) parts.push(card.cardNumber.startsWith('#') ? card.cardNumber : `#${card.cardNumber}`);
  return parts.join(' · ');
}

function justSavedFrom(state: unknown): boolean {
  return Boolean(state && typeof state === 'object' && 'justSaved' in state && (state as { justSaved?: boolean }).justSaved);
}

function DetailBody({
  card,
  justSaved,
  locations,
  onPatch,
  onEdit,
  onDelete,
}: {
  card: CardRecord;
  justSaved: boolean;
  locations: string[];
  onPatch: (patch: Partial<CardDraft>) => Promise<void>;
  onEdit: (draft: CardDraft, images: { front?: Blob | null; back?: Blob | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [seenId, setSeenId] = useState(card.id);
  const [draft, setDraft] = useState<CardDraft>(() => draftFromCard(card));
  const [message, setMessage] = useState<string | null>(justSaved ? 'Saved on this iPad.' : null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const front = usePhotoSlot(card.frontImageId);
  const back = usePhotoSlot(card.backImageId);
  if (seenId !== card.id) {
    setSeenId(card.id);
    setEditing(false);
    setDraft(draftFromCard(card));
    setSide('front');
    setMessage(null);
    setError(null);
  }
  const saved = useRef(false);
  const dirtyRef = useRef(false);
  dirtyRef.current =
    editing &&
    (front.change !== undefined || back.change !== undefined || JSON.stringify(draft) !== JSON.stringify(draftFromCard(card)));
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      !saved.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);
  const frontUrl = useImageUrl(card.frontImageId);
  const backUrl = useImageUrl(card.backImageId);
  const showingBack = side === 'back' && Boolean(backUrl);
  const photo = showingBack ? backUrl : frontUrl;

  function startEdit() {
    setDraft(draftFromCard(card));
    front.reset();
    back.reset();
    setEditing(true);
    setError(null);
  }

  async function save(next: CardDraft) {
    setBusy(true);
    setError(null);
    try {
      await onEdit(next, { front: front.change, back: back.change });
      saved.current = true;
      setEditing(false);
      setMessage('Saved.');
      front.reset();
      back.reset();
      saved.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that card. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const condition =
    card.conditionType === 'graded'
      ? [card.gradeCompany, card.grade].filter(Boolean).join(' ') || 'Graded'
      : card.conditionNote
        ? `Raw · ${card.conditionNote}`
        : 'Raw';

  return (
    <div className="stack has-dock">
      {message ? (
        <p className="banner info" role="status">
          {message}
        </p>
      ) : null}
      {editing ? (
        <section className="stack">
          <div className="section-head">
            <h1>Edit card</h1>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                front.reset();
                back.reset();
                setDraft(draftFromCard(card));
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <CardForm
            key={card.updatedAt}
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
            submitLabel="Save changes"
            busy={busy}
          />
        </section>
      ) : (
        <article className="detail">
          <div className="detail-photo-wrap">
            <div className="detail-photo">
              {photo ? (
                <img src={photo} alt={`${card.name}, ${showingBack ? 'back' : 'front'}`} />
              ) : (
                <div className="tile-fallback detail-fallback" style={{ background: CATEGORY_COLOR[card.category] }}>
                  {card.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            {backUrl && frontUrl ? (
              <button type="button" className="btn ghost" onClick={() => setSide((value) => (value === 'front' ? 'back' : 'front'))}>
                {showingBack ? 'Show front' : 'Show back'}
              </button>
            ) : null}
          </div>
          <div className="detail-copy">
            <div className="section-head">
              <h1>{card.name}</h1>
              <button
                type="button"
                className={card.favourite ? 'star-btn static on' : 'star-btn static'}
                aria-pressed={card.favourite}
                onClick={() => void onPatch({ favourite: !card.favourite })}
              >
                <StarIcon filled={card.favourite} />
                {card.favourite ? 'Starred' : 'Star'}
              </button>
            </div>
            <p className="lede">{cardSummary(card)}</p>
            <p>
              <span className="pill">
                <span className="dot" style={{ background: CATEGORY_COLOR[card.category] }} />
                {card.category}
              </span>
            </p>
            <ul className="meta-list">
              <li>
                <span>Condition</span>
                <strong>{condition}</strong>
              </li>
              <li>
                <span>Quantity</span>
                <strong>{card.quantity}</strong>
              </li>
              {card.purchasePrice != null ? (
                <li>
                  <span>Paid</span>
                  <strong>{formatMoney(card.purchasePrice)}</strong>
                </li>
              ) : null}
              {card.location ? (
                <li>
                  <span>Lives in</span>
                  <strong>{card.location}</strong>
                </li>
              ) : null}
              <li>
                <span>Added</span>
                <strong>{formatDate(card.createdAt)}</strong>
              </li>
            </ul>
            {card.notes ? <p className="notes">{card.notes}</p> : null}
            <PricePanel subject={card} price={card} quantity={card.quantity} onCommit={(price) => onPatch(price)} />
            <div className="action-row pair">
              <button type="button" className="btn ghost" onClick={startEdit}>
                Edit details
              </button>
              <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
                Delete card
              </button>
            </div>
          </div>
        </article>
      )}
      {confirmDelete ? (
        <Modal title="Delete this card?" onClose={() => setConfirmDelete(false)}>
          <p>{card.name} will be removed from this iPad. A backup file you already saved won't change.</p>
          <div className="action-row pair">
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                void onDelete().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Couldn't delete that card.");
                  setConfirmDelete(false);
                });
              }}
            >
              Delete card
            </button>
            <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </div>
        </Modal>
      ) : null}
      {blocker.state === 'blocked' ? (
        <Modal title="Leave without saving?" onClose={() => blocker.reset()}>
          <p>These edits aren't saved yet.</p>
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
