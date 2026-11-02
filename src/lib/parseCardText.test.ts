import { describe, expect, it } from 'vitest';
import { emptyDraft, applyOcr } from './draft';
import { parseCardText } from './parseCardText';

describe('parseCardText', () => {
  it('reads a football chrome card', () => {
    const parsed = parseCardText(`2023 TOPPS CHROME
PATRICK MAHOMES II
KANSAS CITY CHIEFS
#15`);
    expect(parsed.year).toBe('2023');
    expect(parsed.brand).toBe('Topps');
    expect(parsed.name).toBe('Patrick Mahomes II');
    expect(parsed.category).toBe('Football');
    expect(parsed.cardNumber).toBe('15');
    expect(parsed.setName).toBe('Topps Chrome');
  });

  it('reads a Pokémon card', () => {
    const parsed = parseCardText(`CHARIZARD
HP 120
Base Set
4/102`);
    expect(parsed.name).toBe('Charizard');
    expect(parsed.category).toBe('Pokémon');
    expect(parsed.cardNumber).toBe('4/102');
    expect(parsed.setName).toBe('Base Set');
    expect(parsed.brand).toBe('Pokémon');
  });

  it('reads a graded basketball card', () => {
    const parsed = parseCardText(`2018 PANINI PRIZM
LUKA DONCIC
DALLAS MAVERICKS
PSA 10
#280`);
    expect(parsed.name).toBe('Luka Doncic');
    expect(parsed.category).toBe('Basketball');
    expect(parsed.brand).toBe('Panini');
    expect(parsed.year).toBe('2018');
    expect(parsed.cardNumber).toBe('280');
    expect(parsed.setName).toBe('Panini Prizm');
    expect(parsed.conditionType).toBe('graded');
    expect(parsed.gradeCompany).toBe('PSA');
    expect(parsed.grade).toBe('10');
  });

  it('joins a first name and last name that are on separate lines', () => {
    const parsed = parseCardText(`2023 TOPPS CHROME
PATRICK
MAHOMES II
KANSAS CITY CHIEFS
#15`);
    expect(parsed.name).toBe('Patrick Mahomes II');
    expect(parsed.cardNumber).toBe('15');
  });

  it('returns nothing for blank text', () => {
    expect(parseCardText('   \n')).toEqual({});
  });

  it('does not overwrite a name the user already typed', () => {
    const next = applyOcr({ ...emptyDraft(), name: 'My card' }, parseCardText('CHARIZARD\nHP 120'));
    expect(next.name).toBe('My card');
    expect(next.category).toBe('Pokémon');
  });
});
