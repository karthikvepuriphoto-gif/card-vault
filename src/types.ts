export const CATEGORIES = [
  'Football',
  'Baseball',
  'Basketball',
  'Hockey',
  'Soccer',
  'Pokémon',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const GRADE_COMPANIES = ['PSA', 'BGS', 'SGC', 'CGC'] as const;
export type GradeCompany = (typeof GRADE_COMPANIES)[number];

export type ConditionType = 'raw' | 'graded';
export type ValueSource = 'manual' | 'tcgplayer' | 'ebay';

export interface CardRecord {
  id: string;
  name: string;
  year: string;
  setName: string;
  cardNumber: string;
  brand: string;
  category: Category;
  conditionType: ConditionType;
  conditionNote: string;
  gradeCompany: GradeCompany | '';
  grade: string;
  quantity: number;
  purchasePrice: number | null;
  currentValue: number | null;
  valueUpdatedAt: string | null;
  valueSource: ValueSource | '';
  location: string;
  notes: string;
  favourite: boolean;
  frontImageId: string | null;
  backImageId: string | null;
  pokemonCardId: string | null;
  pokemonPriceVariant: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CardDraft = Omit<CardRecord, 'id' | 'frontImageId' | 'backImageId' | 'createdAt' | 'updatedAt'>;

export interface PriceInfo {
  currentValue: number | null;
  valueUpdatedAt: string | null;
  valueSource: ValueSource | '';
  pokemonCardId: string | null;
  pokemonPriceVariant: string | null;
}

export interface CardIdentity {
  name: string;
  year: string;
  setName: string;
  cardNumber: string;
  brand: string;
  category: Category;
  conditionType: ConditionType;
  gradeCompany: GradeCompany | '';
  grade: string;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isGradeCompany(value: string): value is GradeCompany {
  return (GRADE_COMPANIES as readonly string[]).includes(value);
}
