// Frontend formatting helpers. Money always arrives as integer cents.

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '$0.00';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${dollars}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  return n.toLocaleString('en-US');
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '0%';
  return `${n}%`;
}

export function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${period}`;
}
