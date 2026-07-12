/**
 * Amount-in-words (FR-09, ADR-001 §AmtWords) — pure, no I/O.
 *
 * The billing cover statement renders the grand total in words, e.g.
 * "Two Hundred Sixty One Thousand Six Hundred Thirty Pesos only". Centavos, when
 * present, render as "… Pesos and NN/100 only". Ported from the design
 * prototype's `pesoWords`; the cents/suffix tail is reconstructed to the
 * ADR-001 format (the source bundle was truncated at that point).
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 0–99 in words. */
function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

/** 0–999 in words. */
function threeDigits(n: number): string {
  const hundreds = n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '';
  return hundreds + (n % 100 ? twoDigits(n % 100) : '');
}

/**
 * Peso amount → cover-statement words. Handles up to the millions; centavos are
 * rounded to two places and appended as "and NN/100" when non-zero.
 * A negative or non-finite input collapses to "Zero Pesos only" rather than
 * emitting a malformed string.
 */
export function pesosInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return 'Zero Pesos only';

  const whole = Math.floor(amount);
  const centavos = Math.round((amount - whole) * 100);

  let words = '';
  let rest = whole;
  const millions = Math.floor(rest / 1_000_000);
  rest %= 1_000_000;
  const thousands = Math.floor(rest / 1_000);
  rest %= 1_000;

  if (millions) words += threeDigits(millions) + ' Million ';
  if (thousands) words += threeDigits(thousands) + ' Thousand ';
  if (rest) words += threeDigits(rest);

  words = words.trim() || 'Zero';

  const suffix = centavos > 0 ? ` and ${String(centavos).padStart(2, '0')}/100` : '';
  return `${words} Pesos${suffix} only`;
}
