import type { Range } from './types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatUSD = (n: number) => usd.format(n);

export const formatRange = (r: Pick<Range, 'low' | 'high'>) => `${usd.format(r.low)} – ${usd.format(r.high)}`;

export const formatPct = (share: number) => `${Math.round(share * 100)}%`;

/** "2026-10-26" → "October 26, 2026" (parsed as a calendar date, not shifted by time zone). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
