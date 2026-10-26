// Build-time data access. Reads /data, validates it and shapes it for pages and the browser.
// Never imported by client scripts (the browser gets only what pages inline or /zip/*.json).
import laborCsv from '../../data/labor_rates.csv?raw';
import zipMetroCsv from '../../data/zip_to_metro.csv?raw';
import zip3Csv from '../../data/zip3_to_state.csv?raw';
import materialsJson from '../../data/materials.json';
import assumptionsJson from '../../data/assumptions.json';
import calculatorsJson from '../../data/calculators.json';
import { parseCsv } from './csv';
import { TRADES, type AreaRates, type AreaType, type Assumptions, type MaterialPrice, type ProjectBundle, type ProjectRecipe, type Trade, type ZipShard } from './types';
import type { Zip3Range } from './zip';

const recipeModules = import.meta.glob<ProjectRecipe>('../../data/projects/*.json', { eager: true, import: 'default' });

export interface CalculatorInfo {
  slug: string;
  name: string;
  short: string;
  live: boolean;
}
export const calculators: CalculatorInfo[] = calculatorsJson.calculators;
export const calculatorPath = (slug: string) => `/${slug}-cost/`;
export const assumptions = assumptionsJson as Assumptions;

export const laborRows = parseCsv(laborCsv);
export const zipRows = parseCsv(zipMetroCsv);
export const zip3Rows = parseCsv(zip3Csv);

export const zip3Ranges: Zip3Range[] = zip3Rows.map((r) => ({ start: r.zip3_start, end: r.zip3_end, state: r.state }));

function buildAreas(): Map<string, AreaRates> {
  const areas = new Map<string, AreaRates>();
  for (const r of laborRows) {
    if (!TRADES.includes(r.trade as Trade)) continue;
    const p25 = Number(r.hourly_p25);
    const median = Number(r.hourly_median);
    const p75 = Number(r.hourly_p75);
    // BLS suppresses some cells ("*", "#"); skip them so the fallback below fills the gap.
    if (![p25, median, p75].every((n) => Number.isFinite(n) && n > 0)) continue;
    let area = areas.get(r.area_code);
    if (!area) {
      area = { code: r.area_code, type: r.area_type as AreaType, name: r.area_name, state: r.state, wages: {} as AreaRates['wages'] };
      areas.set(r.area_code, area);
    }
    area.wages[r.trade as Trade] = { p25, median, p75 };
  }
  const nat = areas.get('US');
  if (!nat) throw new Error('labor_rates.csv needs national rows (area_code "US").');
  for (const t of TRADES) if (!nat.wages[t]) throw new Error(`labor_rates.csv: national wage for "${t}" is missing.`);
  // Fill trades a metro or state lacks: metro → its state → national.
  for (const area of areas.values()) {
    for (const t of TRADES) {
      if (area.wages[t]) continue;
      const fallback = area.type === 'metro' ? areas.get(area.state)?.wages[t] : undefined;
      area.wages[t] = fallback ?? nat.wages[t];
    }
  }
  return areas;
}

export const areas = buildAreas();
export const nationalArea = areas.get('US')!;

/** The rates for a state, or null when we have no state-level rows for it. */
export const stateArea = (state: string) => {
  const a = areas.get(state);
  return a?.type === 'state' ? a : null;
};

export function getBundle(slug: string): ProjectBundle {
  const recipe = Object.entries(recipeModules).find(([path]) => path.endsWith(`/${slug}.json`))?.[1];
  if (!recipe) throw new Error(`No recipe at data/projects/${slug}.json`);
  const prices = (materialsJson.projects as Record<string, Record<string, MaterialPrice>>)[slug];
  if (!prices) throw new Error(`materials.json has no prices for "${slug}"`);
  for (const m of recipe.materials) if (!prices[m.item]) throw new Error(`${slug}: material "${m.item}" has no price in materials.json`);
  // Ship only the prices this recipe uses.
  const used = Object.fromEntries(recipe.materials.map((m) => [m.item, prices[m.item]]));
  return { recipe, prices: used, assumptions };
}

export const liveSlugs = () => calculators.filter((c) => c.live).map((c) => c.slug);

/** Newest "last_updated" and every distinct source behind a calculator's numbers. */
export function dataProvenance(slug: string) {
  const { recipe } = getBundle(slug);
  const entries = [
    { label: 'Labor rates', last_updated: maxDate(laborRows.map((r) => r.last_updated)), source: unique(laborRows.map((r) => r.source)) },
    { label: 'ZIP to metro', last_updated: maxDate(zipRows.map((r) => r.last_updated)), source: unique(zipRows.map((r) => r.source)) },
    { label: 'Material prices', last_updated: materialsJson.last_updated, source: [materialsJson.source] },
    { label: 'Project quantities & hours', last_updated: recipe.last_updated, source: [recipe.source] },
    { label: 'Markup & ranges', last_updated: assumptions.last_updated, source: [assumptions.source] },
  ];
  return { lastUpdated: maxDate(entries.map((e) => e.last_updated)), entries };
}

const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))];
const maxDate = (xs: string[]) => xs.filter(Boolean).sort().at(-1) ?? '';

/** Every 3-digit prefix that maps to a state. */
export function allPrefixes(): string[] {
  const out: string[] = [];
  for (const r of zip3Ranges) for (let n = Number(r.start); n <= Number(r.end); n++) out.push(String(n).padStart(3, '0'));
  return out;
}

/** The small JSON file the browser fetches for one ZIP prefix. */
export function buildShard(prefix: string): ZipShard {
  const state = zip3Ranges.find((r) => prefix >= r.start && prefix <= r.end)?.state ?? null;
  const zips: Record<string, string> = {};
  const shardAreas: Record<string, AreaRates> = {};
  for (const r of zipRows) {
    if (!r.zip.startsWith(prefix)) continue;
    const metro = areas.get(r.metro_code);
    if (!metro) continue;
    zips[r.zip] = r.metro_code;
    shardAreas[r.metro_code] = metro;
  }
  const st = state ? stateArea(state) : null;
  if (st) shardAreas[st.code] = st;
  return { prefix, state, zips, areas: shardAreas };
}
