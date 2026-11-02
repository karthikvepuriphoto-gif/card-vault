import { useId, useRef, useState, type FormEvent } from 'react';
import { CATEGORIES, GRADE_COMPANIES, type CardDraft } from '../types';
import { CATEGORY_COLOR } from '../lib/categories';
import { cleanDraft, validateDraft } from '../lib/draft';
import { moneyInputValue, parseMoney } from '../lib/money';
import { PricePanel, type PricePanelHandle } from './PricePanel';
import { PhotoSlot } from './PhotoSlot';
import { StarIcon } from './Icons';

export function CardForm({
  draft,
  onChange,
  onSubmit,
  locations,
  frontUrl,
  backUrl,
  frontError,
  backError,
  onFrontFile,
  onBackFile,
  onClearFront,
  onClearBack,
  onReadPhoto,
  reading,
  readProgress,
  banner,
  submitLabel,
  busy,
}: {
  draft: CardDraft;
  onChange: (next: CardDraft) => void;
  onSubmit: (next: CardDraft) => void;
  locations: string[];
  frontUrl: string | null;
  backUrl: string | null;
  frontError?: string | null;
  backError?: string | null;
  onFrontFile: (file: File) => void;
  onBackFile: (file: File) => void;
  onClearFront?: () => void;
  onClearBack?: () => void;
  onReadPhoto?: () => void;
  reading?: boolean;
  readProgress?: number;
  banner?: string | null;
  submitLabel: string;
  busy?: boolean;
}) {
  const priceRef = useRef<PricePanelHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(moneyInputValue(draft.purchasePrice));
  const locationList = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const committed = priceRef.current?.commit(false);
    if (committed && !committed.ok) {
      setError(committed.error);
      return;
    }
    const purchase = parseMoney(paid);
    if (purchase === 'invalid') {
      setError('Purchase price should look like 12.50, or be left blank.');
      return;
    }
    const next = cleanDraft({
      ...(committed && committed.ok ? { ...draft, ...committed.price } : draft),
      purchasePrice: purchase,
    });
    const problem = validateDraft(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onChange(next);
    onSubmit(next);
  }

  return (
    <form className="review" onSubmit={handleSubmit}>
      <div className="review-photos">
        <PhotoSlot
          label="Front"
          alt="Front of the card"
          url={frontUrl}
          error={frontError}
          onFile={onFrontFile}
          onClear={frontUrl ? onClearFront : undefined}
        />
        <PhotoSlot
          label="Back"
          alt="Back of the card"
          url={backUrl}
          error={backError}
          onFile={onBackFile}
          onClear={backUrl ? onClearBack : undefined}
        />
        {onReadPhoto ? (
          <button type="button" className="btn ghost" onClick={onReadPhoto} disabled={reading || (!frontUrl && !backUrl)}>
            {reading ? 'Reading the photo…' : 'Fill empty fields from the photo'}
          </button>
        ) : null}
        {reading ? <progress value={readProgress && readProgress > 0 ? readProgress : undefined} max={1} /> : null}
      </div>
      <div className="review-fields">
        {banner ? (
          <p className="banner info" role="status">
            {banner}
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          Name
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            required
            maxLength={80}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Player or Pokémon"
          />
        </label>
        <div className="action-row pair">
          <label className="field">
            Year
            <input
              value={draft.year}
              onChange={(event) => onChange({ ...draft, year: event.target.value })}
              inputMode="numeric"
              maxLength={12}
              autoComplete="off"
              placeholder="2024"
            />
          </label>
          <label className="field">
            Card number
            <input
              value={draft.cardNumber}
              onChange={(event) => onChange({ ...draft, cardNumber: event.target.value })}
              maxLength={24}
              autoComplete="off"
              spellCheck={false}
              placeholder="15 or 4/102"
            />
          </label>
        </div>
        <div className="action-row pair">
          <label className="field">
            Set
            <input
              value={draft.setName}
              onChange={(event) => onChange({ ...draft, setName: event.target.value })}
              maxLength={80}
              autoComplete="off"
              placeholder="Topps Chrome"
            />
          </label>
          <label className="field">
            Brand
            <input
              value={draft.brand}
              onChange={(event) => onChange({ ...draft, brand: event.target.value })}
              maxLength={40}
              autoComplete="off"
              placeholder="Topps, Panini, Pokémon"
            />
          </label>
        </div>
        <fieldset className="field">
          <legend>Category</legend>
          <div className="chips wrap" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="radio"
                aria-checked={draft.category === category}
                className={draft.category === category ? 'chip on' : 'chip'}
                onClick={() => onChange({ ...draft, category })}
              >
                <span className="dot" style={{ background: CATEGORY_COLOR[category] }} />
                {category}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>Condition</legend>
          <div className="chips wrap" role="radiogroup" aria-label="Condition">
            <button
              type="button"
              role="radio"
              aria-checked={draft.conditionType === 'raw'}
              className={draft.conditionType === 'raw' ? 'chip on' : 'chip'}
              onClick={() => onChange({ ...draft, conditionType: 'raw' })}
            >
              Raw
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={draft.conditionType === 'graded'}
              className={draft.conditionType === 'graded' ? 'chip on' : 'chip'}
              onClick={() => onChange({ ...draft, conditionType: 'graded' })}
            >
              Graded
            </button>
          </div>
          {draft.conditionType === 'raw' ? (
            <label className="field">
              Condition note
              <input
                value={draft.conditionNote}
                onChange={(event) => onChange({ ...draft, conditionNote: event.target.value })}
                maxLength={200}
                placeholder="Near mint, tiny corner nick"
              />
            </label>
          ) : (
            <>
              <div className="chips wrap" role="radiogroup" aria-label="Grading company">
                {GRADE_COMPANIES.map((company) => (
                  <button
                    key={company}
                    type="button"
                    role="radio"
                    aria-checked={draft.gradeCompany === company}
                    className={draft.gradeCompany === company ? 'chip on' : 'chip'}
                    onClick={() => onChange({ ...draft, gradeCompany: company })}
                  >
                    {company}
                  </button>
                ))}
              </div>
              <label className="field">
                Grade
                <input
                  value={draft.grade}
                  onChange={(event) => onChange({ ...draft, grade: event.target.value })}
                  maxLength={8}
                  placeholder="10 or 9.5"
                  inputMode="decimal"
                />
              </label>
            </>
          )}
        </fieldset>
        <div className="field">
          <span>Quantity</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => onChange({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}
              aria-label="Fewer copies"
            >
              −
            </button>
            <output aria-live="polite">{draft.quantity}</output>
            <button
              type="button"
              onClick={() => onChange({ ...draft, quantity: Math.min(999, draft.quantity + 1) })}
              aria-label="More copies"
            >
              +
            </button>
          </div>
        </div>
        <label className="field">
          Purchase price
          <input inputMode="decimal" autoComplete="off" value={paid} placeholder="Optional" onChange={(event) => setPaid(event.target.value)} />
        </label>
        <PricePanel
          ref={priceRef}
          subject={draft}
          price={draft}
          quantity={draft.quantity}
          onCommit={(next) => onChange({ ...draft, ...next })}
        />
        <label className="field">
          Where it lives
          <input
            value={draft.location}
            onChange={(event) => onChange({ ...draft, location: event.target.value })}
            maxLength={80}
            placeholder="Blue binder, page 4"
            list={locationList}
          />
        </label>
        <datalist id={locationList}>
          {locations.map((location) => (
            <option key={location} value={location} />
          ))}
        </datalist>
        <label className="field">
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onChange({ ...draft, notes: event.target.value })}
            maxLength={2000}
            placeholder="Anything you want to remember"
          />
        </label>
        <button
          type="button"
          className={draft.favourite ? 'star-btn static on' : 'star-btn static'}
          aria-pressed={draft.favourite}
          onClick={() => onChange({ ...draft, favourite: !draft.favourite })}
        >
          <StarIcon filled={draft.favourite} />
          {draft.favourite ? 'Starred' : 'Star this card'}
        </button>
        <button type="submit" className="btn primary full" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
