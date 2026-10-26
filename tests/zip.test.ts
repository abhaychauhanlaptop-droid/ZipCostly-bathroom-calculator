import { describe, expect, it } from 'vitest';
import { normalizeZip, resolveArea, shardUrl, stateForZip } from '../src/lib/zip';
import { allPrefixes, buildShard, nationalArea, zip3Ranges } from '../src/lib/data';

const lookup = (zip: string) => resolveArea(zip, buildShard(zip.slice(0, 3)), nationalArea);

describe('normalizeZip', () => {
  it('accepts 5-digit and ZIP+4 forms', () => {
    expect(normalizeZip('10001')).toBe('10001');
    expect(normalizeZip(' 02108 ')).toBe('02108');
    expect(normalizeZip('10001-1234')).toBe('10001');
    expect(normalizeZip('100011234')).toBe('10001');
  });
  it('rejects malformed input', () => {
    for (const bad of ['', '1234', '123456', 'abcde', '10 001', '1000l', '10001-12', null, 10001]) {
      expect(normalizeZip(bad)).toBeNull();
    }
  });
});

describe('stateForZip', () => {
  it('maps prefixes to states, keeping leading zeros', () => {
    expect(stateForZip('02108', zip3Ranges)).toBe('MA');
    expect(stateForZip('10001', zip3Ranges)).toBe('NY');
    expect(stateForZip('90210', zip3Ranges)).toBe('CA');
    expect(stateForZip('99501', zip3Ranges)).toBe('AK');
  });
  it('returns null for unassigned prefixes', () => {
    expect(stateForZip('00000', zip3Ranges)).toBeNull();
    expect(stateForZip('09001', zip3Ranges)).toBeNull(); // military APO range
  });
});

describe('resolveArea', () => {
  it('uses metro rates for a known ZIP', () => {
    const r = lookup('10001');
    expect(r.ok && r.level).toBe('metro');
    expect(r.ok && r.area.code).toBe('35620');
    expect(r.ok && r.stateArea?.code).toBe('NY');
  });
  it('falls back to state rates for an unknown ZIP in a state we have', () => {
    const r = lookup('14201'); // Buffalo, NY: not in the sample
    expect(r.ok && r.level).toBe('state');
    expect(r.ok && r.area.code).toBe('NY');
  });
  it('falls back to national rates when the state has no data yet', () => {
    const r = lookup('59601'); // Helena, MT
    expect(r.ok && r.level).toBe('national');
    expect(r.ok && r.state).toBe('MT');
    expect(r.ok && r.stateArea).toBeNull();
  });
  it('errors on a malformed ZIP', () => {
    const r = resolveArea('12ab5', null, nationalArea);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/5-digit/);
  });
  it('errors on a well-formed ZIP that does not exist', () => {
    const r = resolveArea('00000', null, nationalArea);
    expect(!r.ok && r.error).toMatch(/couldn't find/);
  });
  it('builds the shard URL from the prefix', () => {
    expect(shardUrl('02108')).toBe('/zip/021.json');
  });
});

describe('ZIP shards', () => {
  it('cover every prefix in zip3_to_state.csv exactly once', () => {
    const p = allPrefixes();
    expect(new Set(p).size).toBe(p.length);
    expect(p).toContain('021');
    expect(p).not.toContain('000');
  });
  it('carry only the ZIPs that start with the prefix', () => {
    const s = buildShard('100');
    expect(Object.keys(s.zips).every((z) => z.startsWith('100'))).toBe(true);
  });
});
