import type { CardIdentity } from '../types';

export function ebaySoldSearchUrl(card: CardIdentity): string {
  const parts = [card.year, card.brand, card.name, card.setName];
  const number = card.cardNumber.trim();
  if (number) {
    parts.push(number.includes('/') || number.startsWith('#') ? number : `#${number}`);
  }
  if (card.category === 'Pokémon') parts.push('pokemon');
  else if (card.category !== 'Other') parts.push(card.category);
  if (card.conditionType === 'graded') {
    const grade = [card.gradeCompany, card.grade].filter(Boolean).join(' ').trim();
    if (grade) parts.push(grade);
  }
  const keywords = parts.map((part) => part.trim()).filter(Boolean).join(' ');
  const params = new URLSearchParams({
    _nkw: keywords,
    LH_Sold: '1',
    LH_Complete: '1',
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

export function openExternal(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
