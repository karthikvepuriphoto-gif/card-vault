import { forwardRef, useImperativeHandle, useState } from 'react';
import type { CardIdentity, PriceInfo } from '../types';
import { formatDate, isValueStale } from '../lib/dates';
import { EbaySoldLink, PriceDock } from './EbaySoldLink';
import { formatMoney, moneyInputValue, parseMoney, roundMoney } from '../lib/money';
import {
  bestPrice,
  refreshSavedPokemonPrice,
  variantLabel,
  isAbortError,
  type PokemonCardSummary,
  type PriceChoice,
} from '../lib/pokemon';
import { PokemonPicker } from './PokemonPicker';

export interface PricePanelHandle {
  commit: (force: boolean) => { ok: true; price: PriceInfo } | { ok: false; error: string };
}

interface CommitResult {
  ok: true;
  price: PriceInfo;
}
interface CommitError {
  ok: false;
  error: string;
}

export const PricePanel = forwardRef<
  PricePanelHandle,
  {
    subject: CardIdentity;
    price: PriceInfo;
    quantity: number;
    onCommit: (price: PriceInfo) => void | Promise<void>;
  }
>(function PricePanel({ subject, price, quantity, onCommit }, ref) {
  const formatted = moneyInputValue(price.currentValue);
  const [text, setText] = useState(formatted);
  const [echo, setEcho] = useState(formatted);
  const [ebayArmed, setEbayArmed] = useState(false);
  const [busy, setBusy] = useState<'lookup' | 'refresh' | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (echo !== formatted) {
    setEcho(formatted);
    setText(formatted);
  }

  function build(force: boolean): CommitResult | CommitError {
    const parsed = parseMoney(text);
    if (parsed === 'invalid') return { ok: false, error: 'Enter a price like 12.50, or leave it blank.' };
    const changed = parsed !== price.currentValue;
    if (!force && !changed) return { ok: true, price };
    return {
      ok: true,
      price: {
        currentValue: parsed,
        valueUpdatedAt: parsed == null ? null : new Date().toISOString(),
        valueSource: parsed == null ? '' : ebayArmed ? 'ebay' : 'manual',
        pokemonCardId: price.pokemonCardId,
        pokemonPriceVariant: price.pokemonPriceVariant,
      },
    };
  }

  useImperativeHandle(ref, () => ({ commit: build }));

  async function commit(force: boolean) {
    const result = build(force);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!force && result.price === price) return;
    setError(null);
    try {
      await onCommit(result.price);
      setEbayArmed(false);
      if (force) setInfo(result.price.currentValue == null ? 'Price cleared.' : 'Price saved on this device.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that price.");
    }
  }

  async function refresh() {
    if (!price.pokemonCardId) {
      setPickerOpen(true);
      return;
    }
    setBusy('refresh');
    setError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const result = await refreshSavedPokemonPrice(
        price.pokemonCardId,
        price.pokemonPriceVariant,
        subject,
        controller.signal,
      );
      if (result.status === 'price') {
        await onCommit({
          currentValue: roundMoney(result.amount),
          valueUpdatedAt: new Date().toISOString(),
          valueSource: 'tcgplayer',
          pokemonCardId: price.pokemonCardId,
          pokemonPriceVariant: result.variant,
        });
        setInfo(`Updated from TCGplayer (${result.label}).`);
      } else if (result.status === 'choose') {
        setPickerOpen(true);
        setInfo('Pick the printing again so we know which price to use.');
      } else {
        setError('No TCGplayer price came back. Look it up again, or type a price.');
      }
    } catch (err) {
      if (isAbortError(err)) setError('The price list took too long. Try again, or type a price.');
      else setError(err instanceof Error ? err.message : "Couldn't refresh that price.");
    } finally {
      window.clearTimeout(timer);
      setBusy(null);
    }
  }

  async function publish(next: PriceInfo, note: string) {
    try {
      await onCommit(next);
      setError(null);
      setInfo(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that price.");
    }
  }

  function pickPokemon(card: PokemonCardSummary, choice: PriceChoice) {
    const amount = bestPrice(choice);
    if (amount == null) return;
    setPickerOpen(false);
    void publish(
      {
        currentValue: roundMoney(amount),
        valueUpdatedAt: new Date().toISOString(),
        valueSource: 'tcgplayer',
        pokemonCardId: card.id,
        pokemonPriceVariant: choice.variant,
      },
      `Using the ${choice.label.toLowerCase()} price from TCGplayer.`,
    );
  }

  const showPokemon = subject.category === 'Pokémon' || Boolean(price.pokemonCardId);
  const source =
    price.valueSource === 'tcgplayer'
      ? `TCGplayer market${price.pokemonPriceVariant ? ` · ${variantLabel(price.pokemonPriceVariant)}` : ''}`
      : price.valueSource === 'ebay'
        ? 'Typed from sold listings'
        : price.valueSource === 'manual'
          ? 'Typed in'
          : '';
  const stale = isValueStale(price.valueUpdatedAt, price.currentValue != null);

  return (
    <section className="price-card" aria-label="Value">
      <p className="kicker">Current value</p>
      <p className="price-figure">{price.currentValue == null ? 'No price yet' : formatMoney(price.currentValue)}</p>
      {source ? <p className="hint">{source}</p> : null}
      {quantity > 1 && price.currentValue != null ? (
        <p className="hint">
          Together {formatMoney(price.currentValue * quantity)} for {quantity}
        </p>
      ) : null}
      <p className="checked">Last checked: {price.valueUpdatedAt ? formatDate(price.valueUpdatedAt) : 'not yet'}</p>
      {stale ? <p className="stale-flag">This price is more than 30 days old.</p> : null}
      {showPokemon ? (
        <button
          type="button"
          className="btn primary"
          onClick={() => void (price.pokemonCardId ? refresh() : setPickerOpen(true))}
          disabled={busy != null}
        >
          {busy === 'refresh' ? 'Checking TCGplayer…' : price.pokemonCardId ? 'Refresh Pokémon price' : 'Find Pokémon price'}
        </button>
      ) : null}
      <EbaySoldLink
        card={subject}
        onOpen={() => {
          setEbayArmed(true);
          setInfo('Sold listings open in Safari. Type the price you want to keep, then tap Use this price.');
        }}
      />
      <label className="field">
        Type a price
        <input
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder="0.00"
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
        />
      </label>
      <div className="action-row pair">
        <button type="button" className="btn primary" onClick={() => void commit(true)}>
          Use this price
        </button>
        {price.currentValue != null ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setText('');
              void publish(
                {
                  currentValue: null,
                  valueUpdatedAt: null,
                  valueSource: '',
                  pokemonCardId: price.pokemonCardId,
                  pokemonPriceVariant: price.pokemonPriceVariant,
                },
                'Price cleared.',
              );
            }}
          >
            Clear price
          </button>
        ) : null}
      </div>
      {ebayArmed ? <p className="hint">Sold listings are open in the browser. Type the price you want to keep.</p> : null}
      {info ? <p role="status">{info}</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {pickerOpen ? (
        <PokemonPicker
          initialName={subject.name}
          setName={subject.setName}
          cardNumber={subject.cardNumber}
          ebayCard={subject}
          onClose={() => setPickerOpen(false)}
          onPick={pickPokemon}
        />
      ) : null}
      {pickerOpen ? null : (
        <PriceDock
          card={subject}
          onOpenEbay={() => {
            setEbayArmed(true);
            setInfo('Sold listings open in Safari. Type the price you want to keep, then tap Use this price.');
          }}
          onFindPokemon={showPokemon ? () => setPickerOpen(true) : undefined}
        />
      )}
    </section>
  );
});
