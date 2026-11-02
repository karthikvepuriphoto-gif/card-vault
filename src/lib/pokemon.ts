export interface PriceChoice {
  variant: string;
  label: string;
  market: number | null;
  mid: number | null;
  low: number | null;
  high: number | null;
}

export interface PokemonCardSummary {
  id: string;
  name: string;
  number: string;
  setName: string;
  rarity: string;
  image: string | null;
  choices: PriceChoice[];
}

export type RefreshResult =
  | { status: 'price'; amount: number; variant: string; label: string }
  | { status: 'choose'; card: PokemonCardSummary }
  | { status: 'missing' };

const VARIANT_LABELS: Record<string, string> = {
  normal: 'Normal',
  holofoil: 'Holofoil',
  reverseHolofoil: 'Reverse holofoil',
  '1stEditionHolofoil': '1st edition holofoil',
  '1stEditionNormal': '1st edition',
  '1stEdition': '1st edition',
  unlimitedHolofoil: 'Unlimited holofoil',
  unlimited: 'Unlimited',
};

const API = 'https://api.pokemontcg.io/v2/cards';

export function variantLabel(variant: string | null): string {
  if (!variant) return '';
  return VARIANT_LABELS[variant] ?? variant.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

export function bestPrice(choice: PriceChoice): number | null {
  return choice.market ?? choice.mid;
}

function asPrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function choicesFromPrices(prices: Record<string, unknown> | undefined): PriceChoice[] {
  if (!prices) return [];
  const choices: PriceChoice[] = [];
  for (const [variant, raw] of Object.entries(prices)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const market = asPrice(row.market);
    const mid = asPrice(row.mid);
    if (market == null && mid == null) continue;
    choices.push({
      variant,
      label: variantLabel(variant),
      market,
      mid,
      low: asPrice(row.low),
      high: asPrice(row.high),
    });
  }
  return choices;
}

export function normalizePokemonCard(input: unknown): PokemonCardSummary | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const set = raw.set && typeof raw.set === 'object' ? (raw.set as Record<string, unknown>) : {};
  const images = raw.images && typeof raw.images === 'object' ? (raw.images as Record<string, unknown>) : {};
  const tcg = raw.tcgplayer && typeof raw.tcgplayer === 'object' ? (raw.tcgplayer as Record<string, unknown>) : {};
  const prices = tcg.prices && typeof tcg.prices === 'object' ? (tcg.prices as Record<string, unknown>) : {};
  return {
    id: raw.id,
    name: raw.name,
    number: typeof raw.number === 'string' ? raw.number : '',
    setName: typeof set.name === 'string' ? set.name : '',
    rarity: typeof raw.rarity === 'string' ? raw.rarity : '',
    image: typeof images.small === 'string' ? images.small : typeof images.large === 'string' ? images.large : null,
    choices: choicesFromPrices(prices),
  };
}

function pokemonTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 0);
}

export function buildPokemonQueries(input: { name: string; setName: string; cardNumber: string }): string[] {
  const nameParts = pokemonTokens(input.name);
  const setToken = pokemonTokens(input.setName)[0] ?? '';
  const number = input.cardNumber.split('/')[0]?.trim().replace(/[^\w-]/g, '') ?? '';
  if (nameParts.length === 0) return [];
  const nameQuery = nameParts.map((part) => `name:${part}`).join(' ');
  const setQuery = setToken ? `set.name:${setToken}` : '';
  const queries: string[] = [];
  if (number && setQuery) queries.push(`${nameQuery} number:${number} ${setQuery}`);
  if (number) queries.push(`${nameQuery} number:${number}`);
  if (setQuery) queries.push(`${nameQuery} ${setQuery}`);
  queries.push(nameQuery);
  return [...new Set(queries)];
}

export function isAbortError(err: unknown): boolean {
  return (err instanceof DOMException && err.name === 'AbortError') || (err instanceof Error && err.name === 'AbortError');
}

async function searchOnce(query: string, signal: AbortSignal): Promise<PokemonCardSummary[]> {
  const url = new URL(API);
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', '12');
  let response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (signal.aborted) throw new DOMException('The lookup was cancelled.', 'AbortError');
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  }
  if (response.status === 400 || response.status === 404) return [];
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = (await response.json()) as { data?: unknown };
  if (!Array.isArray(body.data)) return [];
  return body.data.map(normalizePokemonCard).filter((card): card is PokemonCardSummary => card != null);
}

export async function fetchPokemonCards(queries: string[], signal: AbortSignal): Promise<PokemonCardSummary[]> {
  if (queries.length === 0) return [];
  let sawServerError = false;
  let sawNetworkError = false;
  for (const query of queries) {
    if (signal.aborted) throw new DOMException('The lookup was cancelled.', 'AbortError');
    try {
      const cards = await searchOnce(query, signal);
      if (cards.length > 0) return cards;
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof TypeError) sawNetworkError = true;
      else sawServerError = true;
    }
  }
  if (sawNetworkError) {
    throw new Error("Couldn't reach the Pokémon price list. Check the connection, or type a price from sold listings.");
  }
  if (sawServerError) {
    throw new Error('The Pokémon price list is busy right now. Try again in a moment, or type a price.');
  }
  return [];
}

async function fetchDirect(id: string, signal: AbortSignal): Promise<PokemonCardSummary | null> {
  const response = await fetch(`${API}/${encodeURIComponent(id)}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: unknown };
  return normalizePokemonCard(body.data);
}

export async function refreshSavedPokemonPrice(
  id: string,
  variant: string | null,
  hint: { name: string; setName: string; cardNumber: string },
  signal: AbortSignal,
): Promise<RefreshResult> {
  let card: PokemonCardSummary | null = null;
  try {
    card = await fetchDirect(id, signal);
  } catch (err) {
    if (isAbortError(err)) throw err;
  }
  if (!card) {
    const cards = await fetchPokemonCards([`id:${id}`, ...buildPokemonQueries(hint)], signal);
    card = cards.find((item) => item.id === id) ?? null;
  }
  if (!card) return { status: 'missing' };
  if (variant) {
    const choice = card.choices.find((item) => item.variant === variant);
    const amount = choice ? bestPrice(choice) : null;
    if (choice && amount != null) {
      return { status: 'price', amount, variant: choice.variant, label: choice.label };
    }
  }
  if (card.choices.length > 0) return { status: 'choose', card };
  return { status: 'missing' };
}
