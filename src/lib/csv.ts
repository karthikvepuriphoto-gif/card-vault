import type { CardRecord } from '../types';

const HEADERS = [
  'Name',
  'Year',
  'Set',
  'Card number',
  'Brand',
  'Category',
  'Condition',
  'Condition note',
  'Grading company',
  'Grade',
  'Quantity',
  'Purchase price (USD)',
  'Current value (USD)',
  'Value last checked',
  'Value source',
  'Location',
  'Notes',
  'Favourite',
  'Added',
];

function cell(value: string | number | null): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function moneyCell(value: number | null): string {
  if (value == null) return '';
  return value.toFixed(2);
}

export function buildCsv(cards: CardRecord[]): string {
  const rows = cards.map((card) =>
    [
      card.name,
      card.year,
      card.setName,
      card.cardNumber,
      card.brand,
      card.category,
      card.conditionType === 'graded' ? 'Graded' : 'Raw',
      card.conditionNote,
      card.gradeCompany,
      card.grade,
      card.quantity,
      moneyCell(card.purchasePrice),
      moneyCell(card.currentValue),
      card.valueUpdatedAt ?? '',
      card.valueSource,
      card.location,
      card.notes,
      card.favourite ? 'yes' : 'no',
      card.createdAt,
    ]
      .map(cell)
      .join(','),
  );
  return [HEADERS.join(','), ...rows].join('\n');
}
