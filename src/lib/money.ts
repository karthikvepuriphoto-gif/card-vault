const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '$0.00';
  return money.format(amount);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function moneyInputValue(amount: number | null): string {
  if (amount == null) return '';
  return amount.toFixed(2);
}

/** Empty input is null. Anything that is not a simple non-negative amount is invalid. */
export function parseMoney(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim().replace(/[$,]/g, '');
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return 'invalid';
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return 'invalid';
  return roundMoney(amount);
}
