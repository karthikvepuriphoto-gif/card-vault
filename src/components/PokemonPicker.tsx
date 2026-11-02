import { useEffect, useRef, useState } from 'react';
import type { CardIdentity } from '../types';
import { formatMoney } from '../lib/money';
import {
  bestPrice,
  buildPokemonQueries,
  cleanPokemonQueryName,
  fetchPokemonCards,
  isAbortError,
  type PokemonCardSummary,
  type PriceChoice,
} from '../lib/pokemon';
import { EbaySoldLink } from './EbaySoldLink';
import { Modal } from './Modal';

export function PokemonPicker({
  initialName,
  setName,
  cardNumber,
  ebayCard,
  onClose,
  onPick,
}: {
  initialName: string;
  setName: string;
  cardNumber: string;
  ebayCard: CardIdentity;
  onClose: () => void;
  onPick: (card: PokemonCardSummary, choice: PriceChoice) => void;
}) {
  const cleaned = cleanPokemonQueryName(initialName);
  const [draftName, setDraftName] = useState(cleaned || initialName);
  const [searchKey, setSearchKey] = useState(0);
  const [results, setResults] = useState<PokemonCardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef(draftName);
  nameRef.current = draftName;
  const selected = results.find((card) => card.id === selectedId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 40000);
    const queries = buildPokemonQueries({ name: nameRef.current, setName, cardNumber });
    setStatus('loading');
    setError(null);
    setResults([]);
    setSelectedId(null);
    if (queries.length === 0) {
      setStatus('ready');
      setError('Type the Pokémon’s name, then tap Search.');
      window.clearTimeout(timer);
      return;
    }
    fetchPokemonCards(queries, controller.signal)
      .then((cards) => {
        if (cancelled) return;
        setResults(cards);
        setStatus('ready');
        if (cards.length === 0) {
          setError('No matching Pokémon cards. Try a shorter name, or check sold prices on eBay.');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResults([]);
        setStatus('error');
        if (isAbortError(err) && timedOut) {
          setError('The price list took too long. Try again, or check sold prices on eBay.');
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

  function searchAgain() {
    setSearchKey((value) => value + 1);
  }

  return (
    <Modal title="Pick the Pokémon card" onClose={onClose}>
      <form
        className="action-row"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          searchAgain();
        }}
      >
        <label className="field">
          Pokémon name
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Pikachu"
          />
        </label>
        <button type="submit" className="btn primary">
          {status === 'loading' ? 'Search again' : 'Search'}
        </button>
      </form>
      <p className="hint">Tap a picture, then pick the printing price. This can take a few seconds.</p>
      {error ? (
        <div className="picker-error" role="alert">
          <p>{error}</p>
          <div className="action-row pair">
            <button type="button" className="btn primary" onClick={searchAgain}>
              Try again
            </button>
            <EbaySoldLink card={{ ...ebayCard, name: draftName || ebayCard.name, category: 'Pokémon' }} />
          </div>
        </div>
      ) : null}
      {selected ? (
        <div className="selected-print">
          <p>
            <strong>{selected.name}</strong>
            {selected.setName ? ` · ${selected.setName}` : ''}
            {selected.number ? ` · #${selected.number}` : ''}
          </p>
          {selected.choices.length === 0 ? <p>No TCGplayer price for this printing. Use the eBay link instead.</p> : null}
          <div className="choice-list">
            {selected.choices.map((choice) => {
              const amount = bestPrice(choice);
              if (amount == null) return null;
              return (
                <button type="button" className="choice" key={choice.variant} onClick={() => onPick(selected, choice)}>
                  <span>{choice.label}</span>
                  <strong>{formatMoney(amount)}</strong>
                  <span>{choice.market != null ? 'Market' : 'Mid'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="poke-grid">
        {results.map((card) => (
          <button
            type="button"
            className={card.id === selectedId ? 'poke-tile on' : 'poke-tile'}
            key={card.id}
            onClick={() => setSelectedId(card.id)}
          >
            {card.image ? (
              <img src={card.image} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="poke-gap">{card.name.slice(0, 1)}</span>
            )}
            <span className="poke-name">{card.name}</span>
            <span className="hint">
              {card.setName || 'Unknown set'}
              {card.number ? ` · #${card.number}` : ''}
            </span>
          </button>
        ))}
      </div>
      {status === 'loading' ? <p role="status">Checking TCGplayer…</p> : null}
    </Modal>
  );
}
