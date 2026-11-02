import { describe, expect, it } from 'vitest';
import { bestPrice, buildPokemonQueries, choicesFromPrices, normalizePokemonCard } from './pokemon';

describe('pokémon prices', () => {
  it('builds a strict query and a name-only fallback', () => {
    const queries = buildPokemonQueries({ name: 'Charizard', setName: 'Base', cardNumber: '4/102' });
    expect(queries[0]).toBe('name:charizard number:4 set.name:base');
    expect(queries).toContain('name:charizard number:4');
    expect(queries.at(-1)).toBe('name:charizard');
  });

  it('prefers the market price', () => {
    const choices = choicesFromPrices({
      holofoil: { low: 10, mid: 20, high: 30, market: 18 },
      normal: { low: null, mid: null },
    });
    expect(choices).toHaveLength(1);
    expect(choices[0]?.label).toBe('Holofoil');
    expect(bestPrice(choices[0]!)).toBe(18);
  });

  it('normalizes a TCGplayer payload', () => {
    const card = normalizePokemonCard({
      id: 'base1-4',
      name: 'Charizard',
      number: '4',
      rarity: 'Rare Holo',
      set: { name: 'Base' },
      images: { small: 'https://images.pokemontcg.io/base1/4.png' },
      tcgplayer: { prices: { holofoil: { market: 100, mid: 90 } } },
    });
    expect(card?.setName).toBe('Base');
    expect(card?.choices[0]?.market).toBe(100);
  });
});
