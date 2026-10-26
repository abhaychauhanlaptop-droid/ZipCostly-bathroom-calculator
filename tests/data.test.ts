import { describe, expect, it } from 'vitest';
import { areas, calculators, dataProvenance, getBundle, laborRows, liveSlugs, nationalArea, zipRows, zip3Rows } from '../src/lib/data';
import { parseCsv } from '../src/lib/csv';
import { TRADES } from '../src/lib/types';
import materials from '../data/materials.json';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('data files', () => {
  it('every CSV row has last_updated and source', () => {
    for (const r of [...laborRows, ...zipRows, ...zip3Rows]) {
      expect(r.last_updated).toMatch(ISO);
      expect(r.source).not.toBe('');
    }
  });
  it('materials.json has last_updated and source', () => {
    expect(materials.last_updated).toMatch(ISO);
    expect(materials.source).not.toBe('');
  });
  it('national rates exist for every trade with p25 ≤ median ≤ p75', () => {
    for (const t of TRADES) {
      const w = nationalArea.wages[t];
      expect(w.p25).toBeLessThanOrEqual(w.median);
      expect(w.median).toBeLessThanOrEqual(w.p75);
    }
  });
  it('every ZIP is 5 digits and points at a metro we have rates for', () => {
    for (const r of zipRows) {
      expect(r.zip).toMatch(/^\d{5}$/);
      expect(areas.get(r.metro_code)?.type).toBe('metro');
    }
  });
  it('material prices rise from budget to premium', () => {
    for (const items of Object.values(materials.projects)) {
      for (const [id, m] of Object.entries(items)) {
        expect(m.price.budget, id).toBeLessThanOrEqual(m.price.mid);
        expect(m.price.mid, id).toBeLessThanOrEqual(m.price.premium);
      }
    }
  });
  it('every live calculator has a valid recipe, prices and provenance', () => {
    for (const slug of liveSlugs()) {
      const b = getBundle(slug);
      expect(b.recipe.slug).toBe(slug);
      for (const rel of b.recipe.related) expect(calculators.map((c) => c.slug)).toContain(rel);
      expect(dataProvenance(slug).lastUpdated).toMatch(ISO);
    }
  });
});

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([{ a: 'x, y', b: 'say "hi"' }]);
  });
  it('keeps leading zeros and skips blank lines', () => {
    expect(parseCsv('zip\n02108\n\n')).toEqual([{ zip: '02108' }]);
  });
});
