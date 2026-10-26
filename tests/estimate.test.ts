import { describe, expect, it } from 'vitest';
import { estimate, EstimateError, resolveOptions, shareOf, validateSize } from '../src/lib/estimate';
import { areas, getBundle, nationalArea } from '../src/lib/data';
import { LEVELS, QUALITIES, type Quality } from '../src/lib/types';

const bath = getBundle('bathroom-remodel');
const nat = nationalArea.wages;
const run = (size = 50, quality: Quality = 'mid', options = {}) => estimate(bath, nat, { size, quality, options });

describe('bathroom remodel estimate', () => {
  it('returns an ordered low < typical < high range', () => {
    const e = run();
    expect(e.total.low).toBeLessThan(e.total.typical);
    expect(e.total.typical).toBeLessThan(e.total.high);
  });

  it('rounds totals to the nearest $100', () => {
    for (const l of LEVELS) expect(run(47).total[l] % 100).toBe(0);
  });

  it('typical national mid-range 50 sq ft lands in the published $9k–$16k band', () => {
    // Angi / HomeAdvisor typical bathroom remodel: roughly $6.6k–$16.6k, average ~$11k.
    const t = run().total.typical;
    expect(t).toBeGreaterThan(9000);
    expect(t).toBeLessThan(16000);
  });

  it('costs more as quality goes up', () => {
    const [b, m, p] = QUALITIES.map((q) => run(50, q).total.typical);
    expect(b).toBeLessThan(m);
    expect(m).toBeLessThan(p);
  });

  it('costs more for a bigger room', () => {
    expect(run(100).total.typical).toBeGreaterThan(run(40).total.typical);
  });

  it('costs more in a high-wage metro than nationally', () => {
    const ny = areas.get('35620')!;
    expect(estimate(bath, ny.wages, { size: 50, quality: 'mid' }).total.typical).toBeGreaterThan(run().total.typical);
  });

  it('category totals add up to the total within rounding', () => {
    const e = run(63);
    for (const l of LEVELS) {
      const sum = e.byCategory.materials[l] + e.byCategory.labor[l] + e.byCategory.permits[l];
      expect(Math.abs(sum - e.total[l])).toBeLessThanOrEqual(50);
    }
  });

  it('every line has a positive cost and a known category', () => {
    for (const line of run().lines) {
      expect(line.cost.typical).toBeGreaterThan(0);
      expect(['materials', 'labor', 'permits']).toContain(line.category);
    }
  });

  it('shares of the typical total sum to about 100%', () => {
    const e = run();
    const total = e.lines.reduce((s, l) => s + shareOf(l.cost.typical, e), 0);
    expect(total).toBeGreaterThan(0.98);
    expect(total).toBeLessThan(1.02);
  });

  describe('options', () => {
    const ids = (opts: Record<string, string>) => run(50, 'mid', opts).lines.map((l) => l.id);

    it('tub/shower includes a bathtub and no glass', () => {
      expect(ids({})).toContain('bathtub');
      expect(ids({})).not.toContain('shower_glass');
    });
    it('walk-in shower swaps the tub for a pan and glass', () => {
      const w = ids({ shower_type: 'walk_in' });
      expect(w).not.toContain('bathtub');
      expect(w).toContain('shower_pan');
      expect(w).toContain('shower_glass');
    });
    it('double vanity, moved plumbing and heated floor each add cost', () => {
      const base = run().total.typical;
      for (const opts of [{ vanity: 'double' }, { relocate_plumbing: 'yes' }, { heated_floor: 'yes' }]) {
        expect(run(50, 'mid', opts).total.typical).toBeGreaterThan(base);
      }
    });
    it('fills defaults for missing options', () => {
      expect(resolveOptions(bath, {})).toEqual({ shower_type: 'tub_shower', vanity: 'single', relocate_plumbing: 'no', heated_floor: 'no' });
    });
    it('rejects an unknown option value', () => {
      expect(() => run(50, 'mid', { shower_type: 'hot_tub' })).toThrow(EstimateError);
    });
  });

  describe('bad input', () => {
    it('rejects zero size', () => {
      expect(validateSize(bath, 0)).toMatch(/greater than 0/);
      expect(() => run(0)).toThrow(EstimateError);
    });
    it('rejects negative, NaN, Infinity and non-numbers', () => {
      for (const s of [-10, NaN, Infinity, '50' as unknown as number, undefined as unknown as number]) {
        expect(() => estimate(bath, nat, { size: s, quality: 'mid' })).toThrow(EstimateError);
      }
    });
    it('rejects sizes outside the recipe min and max', () => {
      expect(validateSize(bath, 10)).toMatch(/at least 15/);
      expect(validateSize(bath, 401)).toMatch(/custom quote/);
      expect(validateSize(bath, 15)).toBeNull();
      expect(validateSize(bath, 400)).toBeNull();
    });
    it('rejects an unknown quality', () => {
      expect(() => run(50, 'luxury' as Quality)).toThrow(EstimateError);
    });
    it('fails clearly when a trade wage is missing', () => {
      const { plumber: _omit, ...rest } = nat;
      expect(() => estimate(bath, rest as typeof nat, { size: 50, quality: 'mid' })).toThrow(/plumber/);
    });
  });
});
