import type { CardIdentity } from '../types';
import { ebaySoldSearchUrl } from '../lib/ebay';

export function EbaySoldLink({
  card,
  className = 'btn ghost',
  onOpen,
}: {
  card: CardIdentity;
  className?: string;
  onOpen?: () => void;
}) {
  return (
    <a
      className={className}
      href={ebaySoldSearchUrl(card)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onOpen?.()}
    >
      Check sold prices on eBay
    </a>
  );
}

export function PriceDock({
  card,
  onOpenEbay,
  onFindPokemon,
}: {
  card: CardIdentity;
  onOpenEbay?: () => void;
  onFindPokemon?: () => void;
}) {
  return (
    <div className="ebay-dock">
      {onFindPokemon ? (
        <button type="button" className="btn primary" onClick={onFindPokemon}>
          Find Pokémon price
        </button>
      ) : null}
      <EbaySoldLink card={card} onOpen={onOpenEbay} />
    </div>
  );
}
