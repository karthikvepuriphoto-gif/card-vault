import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '../lib/money';
import {
  bestPrice,
  buildPokemonQueries,
  fetchPokemonCards,
  isAbortError,
  type PokemonCardSummary,
  type PriceChoice,
} from '../lib/pokemon';
import { Modal } from './Modal';

export function PokemonPicker({
  initialName,
  setName,
  cardNumber,
  onClose,
  onPick,
}: {
  initialName: string;
  setName: string;
  cardNumber: string;
  onClose: () => void;
  onPick: (card: PokemonCardSummary, choice: PriceChoice) => void;
}) {
  const [draftName, setDraftName] = useState(initialName);
  const [searchKey, setSearchKey] = useState(0);
  const [results, setResults] = useState<PokemonCardSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef(draftName);
  nameRef.current = draftName;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 25000);
    const queries = buildPokemonQueries({ name: nameRef.current, setName, cardNumber });
    setStatus('loading');
    setError(null);
    if (queries.length === 0) {
      setResults([]);
      setStatus('ready');
      setError("Type the Pokémon's name, then search.");
      window.clearTimeout(timer);
      return;
    }
    fetchPokemonCards(queries, controller.signal)
      .then((cards) => {
        if (cancelled) return;
        setResults(cards);
        setStatus('ready');
        if (cards.length === 0) setError('No matching Pokémon cards. Try a simpler name, or type the price yourself.');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResults([]);
        setStatus('error');
        if (isAbortError(err) && timedOut) {
          setError('The price list took too long. Try again, or type a price.');
          return;
        }
        if (isAbortError(err)) return;
        setError(err instanceof Error ? err.message : "Couldn't look up that card.");
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchKey, setName, cardNumber]);

  return (
    <Modal title="Pick the Pokémon card" onClose={onClose}>
      <form
        className="action-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchKey((value) => value + 1);
        }}
      >
        <label className="field">
          Name
          <input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoComplete="off" />
        </label>
        <button type="submit" className="btn primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'Checking TCGplayer…' : 'Search'}
        </button>
      </form>
      <p className="hint">This can take a few seconds. Market price is the TCGplayer price.</p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="poke-list">
        {results.map((card) => (
          <article className="poke" key={card.id}>
            {card.image ? <img src={card.image} alt="" referrerPolicy="no-referrer" /> : <div className="poke-gap" />}
            <div>
              <h3>{card.name}</h3>
              <p>
                {card.setName || 'Unknown set'}
                {card.number ? ` · #${card.number}` : ''}
              </p>
              {card.rarity ? <p className="hint">{card.rarity}</p> : null}
              <div className="choice-list">
                {card.choices.length === 0 ? <p>No TCGplayer price for this printing.</p> : null}
                {card.choices.map((choice) => {
                  const amount = bestPrice(choice);
                  if (amount == null) return null;
                  return (
                    <button type="button" className="choice" key={choice.variant} onClick={() => onPick(card, choice)}>
                      <span>{choice.label}</span>
                      <strong>{formatMoney(amount)}</strong>
                      <span>{choice.market != null ? 'Market' : 'Mid'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Modal>
  );
}
