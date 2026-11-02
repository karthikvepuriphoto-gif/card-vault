import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCollection } from '../collection';
import { isBackupDue } from '../lib/dates';
import { useOnline } from '../lib/useOnline';
import { ChevronLeft, VaultMark } from './Icons';

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const online = useOnline();
  const { status, error, reload, cards, lastBackupAt } = useCollection();
  const home = location.pathname === '/';
  const backupDue = cards.length > 0 && isBackupDue(lastBackupAt);

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          {home ? (
            <h1 className="brand">
              <VaultMark />
              <span className="brand-name">Card Vault</span>
            </h1>
          ) : (
            <Link to="/" className="back-link">
              <ChevronLeft />
              Collection
            </Link>
          )}
          {home ? (
            <div className="top-actions">
              <Link to="/backup" className="btn ghost small">
                Back up
                {backupDue ? <span className="dot alert" aria-label="Backup reminder" /> : null}
              </Link>
              <Link to="/add" className="btn primary small">
                Add a card
              </Link>
            </div>
          ) : (
            <Link to="/" className="brand brand-quiet" aria-label="Card Vault home">
              <VaultMark />
            </Link>
          )}
        </div>
      </header>
      {!online ? (
        <p className="banner warn" role="status">
          You're offline. Cards already on this iPad still open. The first photo read and price lookup need a connection.
        </p>
      ) : null}
      <main id="main">
        {status === 'loading' ? <p className="loading">Opening your collection…</p> : null}
        {status === 'error' ? (
          <div className="empty">
            <h2>Storage didn't open</h2>
            <p>{error}</p>
            <button type="button" className="btn primary" onClick={() => void reload()}>
              Try again
            </button>
          </div>
        ) : null}
        {status === 'ready' ? children : null}
      </main>
    </div>
  );
}
