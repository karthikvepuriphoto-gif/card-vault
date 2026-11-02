import type { CardDraft, Category, GradeCompany } from '../types';
import { isGradeCompany } from '../types';
import { CITY_PHRASES, SPORT_PHRASES, SPORT_WORDS, TEAM_PHRASES, TEAM_WORDS } from './sportsDictionary';

const BRANDS: { match: string; label: string }[] = [
  { match: 'upper deck', label: 'Upper Deck' },
  { match: 'o-pee-chee', label: 'O-Pee-Chee' },
  { match: 'topps', label: 'Topps' },
  { match: 'panini', label: 'Panini' },
  { match: 'bowman', label: 'Bowman' },
  { match: 'donruss', label: 'Donruss' },
  { match: 'fleer', label: 'Fleer' },
  { match: 'skybox', label: 'SkyBox' },
  { match: 'score', label: 'Score' },
  { match: 'pinnacle', label: 'Pinnacle' },
  { match: 'leaf', label: 'Leaf' },
  { match: 'wizards', label: 'Wizards' },
  { match: 'pokémon', label: 'Pokémon' },
  { match: 'pokemon', label: 'Pokémon' },
].sort((a, b) => b.match.length - a.match.length);

const SET_PHRASES = [
  'national treasures',
  'stadium club',
  'gypsy queen',
  'allen & ginter',
  'allen and ginter',
  'cosmic eclipse',
  'scarlet & violet',
  'scarlet and violet',
  'paldean fates',
  'obsidian flames',
  'evolving skies',
  'fusion strike',
  'brilliant stars',
  'silver tempest',
  'crown zenith',
  'lost origin',
  'astral radiance',
  'battle styles',
  'chilling reign',
  'darkness ablaze',
  'rebel clash',
  'sword & shield',
  'sword and shield',
  'sun & moon',
  'sun and moon',
  'hidden fates',
  'shining fates',
  'vivid voltage',
  'champions path',
  'prismatic evolutions',
  'surging sparks',
  'stellar crown',
  'twilight masquerade',
  'temporal forces',
  'paradox rift',
  'paldea evolved',
  'journey together',
  'court kings',
  'black & white',
  'diamond & pearl',
  'base set',
  'topps chrome',
  'celebrations',
  'chronicles',
  'contenders',
  'illusions',
  'prestige',
  'absolute',
  'heritage',
  'mosaic',
  'chrome',
  'prizm',
  'optic',
  'select',
  'finest',
  'donruss',
  'bowman',
  'hoops',
].sort((a, b) => b.length - a.length);

const WORD = (word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

const SPORT_WORD_RES = {
  Football: SPORT_WORDS.Football.map(WORD),
  Baseball: SPORT_WORDS.Baseball.map(WORD),
  Basketball: SPORT_WORDS.Basketball.map(WORD),
  Hockey: SPORT_WORDS.Hockey.map(WORD),
  Soccer: SPORT_WORDS.Soccer.map(WORD),
};

function hasPhrase(text: string, phrase: string): boolean {
  if (phrase.length <= 6 && !phrase.includes(' ')) return WORD(phrase).test(text);
  return text.toLowerCase().includes(phrase);
}

export function tidyName(line: string): string {
  const letters = line.replace(/[^A-Za-z]/g, '');
  const allCaps = letters.length > 0 && letters === letters.toUpperCase();
  return line
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'ii' || lower === 'iii' || lower === 'iv') return lower.toUpperCase();
      if (lower === 'jr') return 'Jr';
      if (lower === 'sr') return 'Sr';
      if (!allCaps) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineIsTeam(line: string): boolean {
  const lower = line
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasTeam =
    TEAM_PHRASES.some((phrase) => lower.includes(phrase)) || lower.split(' ').some((word) => TEAM_WORDS.has(word));
  if (!hasTeam) return false;
  let rest = ` ${lower} `;
  const phrases = [...CITY_PHRASES, ...TEAM_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) rest = rest.replaceAll(` ${phrase} `, ' ');
  const parts = rest
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word && !TEAM_WORDS.has(word));
  return parts.length === 0;
}

function detectCategory(text: string): Category | undefined {
  let pokemon = 0;
  if (/pok[eé]mon/i.test(text)) pokemon += 3;
  if (/\bhp\s*\d{2,3}\b/i.test(text)) pokemon += 2;
  if (/\b(weakness|resistance|retreat cost)\b/i.test(text)) pokemon += 2;
  if (/\b(stage\s*[123]|basic pokemon|trainer|energy)\b/i.test(text)) pokemon += 1;

  const scores = {
    Football: scoreSport(text, 'Football'),
    Baseball: scoreSport(text, 'Baseball'),
    Basketball: scoreSport(text, 'Basketball'),
    Hockey: scoreSport(text, 'Hockey'),
    Soccer: scoreSport(text, 'Soccer'),
  };
  const bestSport = (Object.entries(scores) as [Exclude<Category, 'Pokémon' | 'Other'>, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (pokemon >= 2 && pokemon >= (bestSport?.[1] ?? 0)) return 'Pokémon';
  if (bestSport && bestSport[1] > 0) return bestSport[0];
  if (pokemon > 0) return 'Pokémon';
  return undefined;
}

function scoreSport(text: string, sport: keyof typeof SPORT_WORDS): number {
  let score = 0;
  for (const phrase of SPORT_PHRASES[sport]) {
    if (text.toLowerCase().includes(phrase)) score += 1;
  }
  for (const pattern of SPORT_WORD_RES[sport]) {
    if (pattern.test(text)) score += 1;
  }
  return score;
}

function isNameFragment(line: string): boolean {
  const cleaned = line.replace(/[^A-Za-z0-9' .&-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || cleaned.length > 28) return false;
  if (/\d/.test(cleaned) || /\b(19[5-9]\d|20[0-3]\d)\b/.test(cleaned)) return false;
  if (lineIsTeam(cleaned) || SET_PHRASES.some((phrase) => hasPhrase(cleaned, phrase))) return false;
  if (BRANDS.some((brand) => cleaned.toLowerCase() === brand.match)) return false;
  const words = cleaned.split(' ');
  return words.length > 0 && words.length <= 3 && cleaned.replace(/[^A-Za-z]/g, '').length >= 3;
}

function mergeNameLines(lines: string[]): string[] {
  const merged: string[] = [];
  for (const line of lines) {
    const previous = merged[merged.length - 1];
    if (previous && isNameFragment(previous) && isNameFragment(line)) {
      const combined = `${previous} ${line}`.replace(/\s+/g, ' ').trim();
      if (combined.split(' ').length <= 4) {
        merged[merged.length - 1] = combined;
        continue;
      }
    }
    merged.push(line);
  }
  return merged;
}

function pickName(lines: string[]): string | undefined {
  lines = mergeNameLines(lines);
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestValue: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const cleaned = line.replace(/[^A-Za-z0-9' .&-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 3 || cleaned.length > 40) continue;
    if (/\b(19[5-9]\d|20[0-3]\d)\b/.test(cleaned)) continue;
    if (/^hp\s*\d+/i.test(cleaned)) continue;
    if (/^(psa|bgs|sgc|cgc)(\s+[0-9.]+)?$/i.test(cleaned)) continue;
    if (lineIsTeam(cleaned)) continue;
    const letters = cleaned.replace(/[^A-Za-z]/g, '');
    const digits = cleaned.replace(/\D/g, '');
    if (letters.length < 3 || digits.length > letters.length) continue;
    const words = cleaned.split(' ');
    if (words.length > 4) continue;
    const allCaps = letters === letters.toUpperCase();
    let score = 2;
    if (allCaps) score += 2;
    if (words.length >= 2 && words.length <= 3) score += 3;
    if (words.length === 1 && letters.length >= 4) score += 2;
    if (SET_PHRASES.some((phrase) => hasPhrase(cleaned, phrase))) score -= 6;
    if (BRANDS.some((brand) => cleaned.toLowerCase().includes(brand.match) && cleaned.length < brand.match.length + 8)) {
      score -= 3;
    }
    score += Math.max(0, 6 - index) * 0.2;
    if (score > bestScore) {
      bestScore = score;
      bestValue = tidyName(cleaned);
    }
  }
  if (!bestValue || bestScore < 2) return undefined;
  return bestValue;
}

function findSet(lines: string[]): string | undefined {
  let best: string | undefined;
  for (const line of lines) {
    if (!SET_PHRASES.some((phrase) => hasPhrase(line, phrase))) continue;
    const cleaned = line
      .replace(/\b(19[5-9]\d|20[0-3]\d)\b/g, ' ')
      .replace(/[#|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 3 || cleaned.length > 48) continue;
    const tidy = tidyName(cleaned);
    if (!best || tidy.length < best.length) best = tidy;
  }
  return best;
}

export function parseCardText(text: string): Partial<CardDraft> {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const flat = lines.join('\n');
  if (!flat.trim()) return {};

  const parsed: Partial<CardDraft> = {};
  const year = flat.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (year?.[1]) parsed.year = year[1];

  const lower = flat.toLowerCase();
  for (const brand of BRANDS) {
    if (lower.includes(brand.match)) {
      parsed.brand = brand.label;
      break;
    }
  }

  const hash = flat.match(/#\s*([A-Za-z]{0,4}\d{1,4}[A-Za-z]?)\b/);
  const numbered = flat.match(/\b(?:No\.?|Number)\s*[:#]?\s*([A-Za-z]{0,3}\d{1,4})\b/i);
  const slash = flat.match(/\b(\d{1,3})\s*\/\s*(\d{2,4})\b/);
  if (hash?.[1]) parsed.cardNumber = hash[1];
  else if (numbered?.[1]) parsed.cardNumber = numbered[1];
  else if (slash?.[1] && slash[2]) parsed.cardNumber = `${slash[1]}/${slash[2]}`;

  const category = detectCategory(flat);
  if (category) parsed.category = category;
  if (category === 'Pokémon' && !parsed.brand) parsed.brand = 'Pokémon';

  const name = pickName(lines);
  if (name) parsed.name = name;
  const setName = findSet(lines);
  if (setName) parsed.setName = setName;

  const graded = flat.match(/\b(PSA|BGS|SGC|CGC)\s+([1-9](?:\.5)?|10)\b/i);
  if (graded?.[1] && graded[2] && isGradeCompany(graded[1].toUpperCase())) {
    parsed.conditionType = 'graded';
    parsed.gradeCompany = graded[1].toUpperCase() as GradeCompany;
    parsed.grade = graded[2];
  }

  return parsed;
}
