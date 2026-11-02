import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../collection';
import { CATEGORY_COLOR } from '../lib/categories';
import { cardCountLabel, collectionStats, filterCards, sortCards, type SortKey } from '../lib/collectionQuery';
import { formatDate, isBackupDue, isValueStale } from '../lib/dates';
import { shouldOfferInstallHint } from '../lib/install';
import { formatMoney } from '../lib/money';
import { useImageUrl } from '../lib/useImageUrl';
import { CATEGORIES, type CardRecord, type Category } from '../types';
import { StarIcon } from '../components/Icons';

export function CollectionPage() {
  const { cards, patchCard, lastBackupAt, installHintDismissed, dismissInstallHint } = useCollection();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [favourites, setFavourites] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');
  const stats = collectionStats(cards);
  const visible = useMemo(
    () => sortCards(filterCards(cards, { query, category, favourites }), sort),
    [cards, query, category, favourites, sort],
  );
  const filtering = query.trim() !== '' || category !== 'all' || favourites;
  const backupDue = cards.length > 0 && isBackupDue(lastBackupAt);
  const offerInstall =
    !installHintDismissed &&
    shouldOfferInstallHint({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone:
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    });

  const meta =
    stats.unpriced > 0
      ? `${cardCountLabel(stats.count)} · ${stats.unpriced === 1 ? '1 still needs a price' : `${stats.unpriced} still need a price`}`
      : cardCountLabel(stats.count);

  return (
    <div className="stack">
      <section className="worth" aria-label="Collection value">
        <p className="worth-kicker">My collection is worth</p>
        <p className="worth-amount">{formatMoney(stats.worth)}</p>
        <p className="worth-meta">{meta}</p>
      </section>
      {backupDue ? (
        <div className="banner remind">
          <p>
            {lastBackupAt
              ? `Last backup was ${formatDate(lastBackupAt)}. Back up so a reset doesn't erase the collection.`
              : "No backup yet. Save a copy to iCloud Drive so a reset doesn't erase the collection."}
          </p>
          <Link to="/backup" className="btn primary small">
            Back up
          </Link>
        </div>
      ) : null}
      {offerInstall ? (
        <div className="banner info">
          <p>To open Card Vault like an app, tap Share in Safari, then Add to Home Screen.</p>
          <button type="button" className="btn ghost small" onClick={() => void dismissInstallHint()}>
            Got it
          </button>
        </div>
      ) : null}
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, set, number"
          aria-label="Search cards"
        />
        <label className="sort">
          Sort
          <select aria-label="Sort cards" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="newest">Date added</option>
            <option value="name">Name</option>
            <option value="value-desc">Value high to low</option>
            <option value="value-asc">Value low to high</option>
          </select>
        </label>
      </div>
      <div className="chips" role="toolbar" aria-label="Filters">
        <button type="button" className={category === 'all' ? 'chip on' : 'chip'} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          All
        </button>
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? 'chip on' : 'chip'}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            <span className="dot" style={{ background: CATEGORY_COLOR[item] }} />
            {item}
          </button>
        ))}
        <button type="button" className={favourites ? 'chip on' : 'chip'} aria-pressed={favourites} onClick={() => setFavourites((value) => !value)}>
          <StarIcon filled={favourites} />
          Stars
        </button>
      </div>
      {filtering ? (
        <p className="hint">
          Showing {visible.length} of {cards.length}
        </p>
      ) : null}
      {cards.length === 0 ? (
        <div className="empty">
          <div className="empty-card" aria-hidden="true" />
          <h2>No cards yet</h2>
          <p>Add the first one with a photo, or type it in.</p>
          <Link to="/add" className="btn primary">
            Add a card
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <h2>Nothing matches</h2>
          <p>Try a different search or filter.</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setFavourites(false);
            }}
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid">
          {visible.map((card) => (
            <CardTile key={card.id} card={card} onFavourite={() => void patchCard(card.id, { favourite: !card.favourite })} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardTile({ card, onFavourite }: { card: CardRecord; onFavourite: () => void }) {
  const photo = useImageUrl(card.frontImageId);
  const stale = isValueStale(card.valueUpdatedAt, card.currentValue != null);
  const subtitle = [card.year, card.setName || card.brand].filter(Boolean).join(' · ');
  return (
    <article className="tile">
      <button
        type="button"
        className={card.favourite ? 'star-btn on' : 'star-btn'}
        aria-pressed={card.favourite}
        aria-label={card.favourite ? `Unstar ${card.name}` : `Star ${card.name}`}
        onClick={onFavourite}
      >
        <StarIcon filled={card.favourite} />
      </button>
      <Link className="tile-open" to={`/card/${card.id}`}>
        {photo ? (
          <img className="tile-photo" src={photo} alt="" />
        ) : (
          <div className="tile-fallback" style={{ background: CATEGORY_COLOR[card.category] }} aria-hidden="true">
            {card.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="tile-body">
          <h2 className="tile-name">{card.name}</h2>
          <p className="tile-sub">{subtitle || card.category}</p>
          <div className="tile-meta">
            <span className="pill">
              <span className="dot" style={{ background: CATEGORY_COLOR[card.category] }} />
              {card.category}
            </span>
            {card.currentValue == null ? (
              <p className="tile-price missing">Needs a price</p>
            ) : (
              <p className={stale ? 'tile-price stale' : 'tile-price'}>
                {formatMoney(card.currentValue)}
                {card.quantity > 1 ? <span className="each"> each</span> : null}
                {stale ? <span className="stale-tag">Old price</span> : null}
              </p>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
