// Money helpers. All amounts are integer cents to avoid floating point errors.

/** Convert integer cents to a display dollar string, e.g. 12345 -> "123.45". */
export function centsToDollarString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, '0');
  return `${sign}${dollars}.${remainder}`;
}

/** Convert a dollar amount (number) to integer cents, rounding safely. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Apply a percentage to a cents amount and return integer cents.
 * Uses Math.round so fractions of a cent are rounded to the nearest cent.
 */
export function percentageOfCents(cents: number, percentage: number): number {
  return Math.round((cents * percentage) / 100);
}
