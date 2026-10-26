import type { AreaRates, ZipShard } from './types';

/** Accepts "12345", " 12345 " or ZIP+4 "12345-6789"; returns the 5-digit ZIP or null. */
export function normalizeZip(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const m = input.trim().match(/^(\d{5})(?:-?\d{4})?$/);
  return m ? m[1] : null;
}

export interface Zip3Range {
  start: string;
  end: string;
  state: string;
}

export function stateForZip(zip: string, ranges: Zip3Range[]): string | null {
  const p = zip.slice(0, 3);
  return ranges.find((r) => p >= r.start && p <= r.end)?.state ?? null;
}

export type AreaLookup =
  | { ok: true; zip: string; level: 'metro' | 'state' | 'national'; area: AreaRates; stateArea: AreaRates | null; state: string | null }
  | { ok: false; error: string };

/**
 * Picks the most local wage data we have for a ZIP: metro, then state, then national.
 * `shard` is the /zip/<prefix>.json file for the ZIP's first 3 digits (null if none exists).
 */
export function resolveArea(input: unknown, shard: ZipShard | null, national: AreaRates): AreaLookup {
  const zip = normalizeZip(input);
  if (!zip) return { ok: false, error: 'Enter a 5-digit US ZIP code.' };
  if (!shard || !shard.state) return { ok: false, error: `We couldn't find ZIP code ${zip}. Check it and try again.` };

  const stateArea = shard.areas[shard.state] ?? null;
  const metroCode = shard.zips[zip];
  const metro = metroCode ? shard.areas[metroCode] : undefined;
  if (metro) return { ok: true, zip, level: 'metro', area: metro, stateArea, state: shard.state };
  if (stateArea) return { ok: true, zip, level: 'state', area: stateArea, stateArea, state: shard.state };
  return { ok: true, zip, level: 'national', area: national, stateArea: null, state: shard.state };
}

export const shardUrl = (zip: string) => `/zip/${zip.slice(0, 3)}.json`;
