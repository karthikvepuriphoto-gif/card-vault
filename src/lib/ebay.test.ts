import { describe, expect, it } from 'vitest';
import { ebaySoldSearchUrl } from './ebay';
import type { CardIdentity } from '../types';

function identity(patch: Partial<CardIdentity> = {}): CardIdentity {
  return {
    name: 'Patrick Mahomes',
    year: '2023',
    setName: 'Chrome',
    cardNumber: '15',
    brand: 'Topps',
    category: 'Football',
    conditionType: 'raw',
    gradeCompany: '',
    grade: '',
    ...patch,
  };
}

describe('ebay sold search', () => {
  it('opens completed sold listings with the card filled in', () => {
    const url = new URL(ebaySoldSearchUrl(identity()));
    expect(url.searchParams.get('LH_Sold')).toBe('1');
    expect(url.searchParams.get('LH_Complete')).toBe('1');
    const keywords = url.searchParams.get('_nkw') ?? '';
    expect(keywords).toContain('Patrick Mahomes');
    expect(keywords).toContain('#15');
    expect(keywords).toContain('Football');
    expect(keywords).not.toContain('PSA');
  });

  it('includes the grade company and grade for a slab', () => {
    const url = new URL(ebaySoldSearchUrl(identity({ conditionType: 'graded', gradeCompany: 'PSA', grade: '10' })));
    expect(url.searchParams.get('_nkw')).toContain('PSA 10');
  });

  it('searches pokemon without a hash when the number already has a slash', () => {
    const url = new URL(
      ebaySoldSearchUrl(identity({ name: 'Charizard', category: 'Pokémon', cardNumber: '4/102', brand: 'Pokémon' })),
    );
    const keywords = url.searchParams.get('_nkw') ?? '';
    expect(keywords).toContain('pokemon');
    expect(keywords).toContain('4/102');
  });
});
