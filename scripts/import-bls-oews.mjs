// Converts a BLS OEWS data export into data/labor_rates.csv.
//
// 1. Download "All data" for the latest year from https://www.bls.gov/oes/tables.htm
//    (e.g. oesm24all.zip → all_data_M_2024.xlsx).
// 2. Open it and "Save as CSV" (keep the header row).
// 3. npm run import:bls -- path/to/all_data_M_2024.csv "BLS OEWS May 2024"
//
// Keeps national, state and metro (MSA) rows for the trades below. Cells BLS suppresses
// ("*", "#") are written as blank; the site fills them from the state or national rate.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/lib/csv.ts';

const SOC_TO_TRADE = {
  '47-2031': 'carpenter',
  '47-2152': 'plumber',
  '47-2111': 'electrician',
  '47-2141': 'painter',
  '47-2181': 'roofer',
  '47-2061': 'general_labor',
  '47-2044': 'tile_setter',
};
// OEWS AREA_TYPE: 1 = U.S., 2 = state, 3 = U.S. territory, 4 = metropolitan area, 6 = nonmetropolitan area
const AREA_TYPES = { 1: 'national', 2: 'state', 4: 'metro' };

const [file, source] = process.argv.slice(2);
if (!file || !source) {
  console.error('Usage: npm run import:bls -- <oews.csv> "<source label, e.g. BLS OEWS May 2024>"');
  process.exit(1);
}

const rows = parseCsv(readFileSync(file, 'utf8')).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toUpperCase(), v])));
const today = new Date().toISOString().slice(0, 10);
const num = (v) => {
  const n = Number(String(v).replace(/[$,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '';
};
const q = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const out = [['area_code', 'area_type', 'area_name', 'state', 'trade', 'soc_code', 'hourly_p25', 'hourly_median', 'hourly_p75', 'last_updated', 'source']];
const counts = { national: 0, state: 0, metro: 0 };
for (const r of rows) {
  const trade = SOC_TO_TRADE[r.OCC_CODE];
  const type = AREA_TYPES[Number(r.AREA_TYPE)];
  if (!trade || !type) continue;
  // Only cross-industry totals (OEWS repeats occupations per industry in some files).
  if (r.I_GROUP && r.I_GROUP !== 'cross-industry') continue;
  if (r.OWN_CODE && !['1235', '12345'].includes(r.OWN_CODE)) continue;
  const code = type === 'national' ? 'US' : type === 'state' ? r.PRIM_STATE : r.AREA;
  const state = type === 'national' ? '' : r.PRIM_STATE;
  out.push([code, type, r.AREA_TITLE, state, trade, r.OCC_CODE, num(r.H_PCT25), num(r.H_MEDIAN), num(r.H_PCT75), today, source]);
  counts[type]++;
}
if (!counts.national) {
  console.error('No national rows found. Is this the OEWS "All data" file with AREA_TYPE, OCC_CODE and H_MEDIAN columns?');
  process.exit(1);
}
writeFileSync('data/labor_rates.csv', out.map((r) => r.map(q).join(',')).join('\n') + '\n');
console.log(`Wrote data/labor_rates.csv: ${counts.national} national, ${counts.state} state, ${counts.metro} metro rows.`);
console.log('Next: npm test, then npm run build.');
