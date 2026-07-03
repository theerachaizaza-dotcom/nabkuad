import { describe, it, expect } from 'vitest';
import { normalizeCount } from './net-bottles';

describe('normalizeCount', () => {
  it('normalizes fractional counts with leftover overflow', () => {
    const result = normalizeCount(5, 898, 700, 'fractional');

    expect(result.fullBottles).toBe(6);
    expect(result.leftoverMl).toBe(198);
    expect(result.netBottles).toBeCloseTo(6.282857142857143, 12);
  });

  it('returns exact net bottles for fractional count when leftover is below capacity', () => {
    const result = normalizeCount(3, 300, 750, 'fractional');

    expect(result.fullBottles).toBe(3);
    expect(result.leftoverMl).toBe(300);
    expect(result.netBottles).toBeCloseTo(3.4, 12);
  });

  it('forces leftover to zero for unit count and carries overflow into full bottles', () => {
    const result = normalizeCount(2, 10, 1, 'unit');

    expect(result.fullBottles).toBe(12);
    expect(result.leftoverMl).toBe(0);
    expect(result.netBottles).toBe(12);
  });

  it('allows zero values for unit mode', () => {
    const result = normalizeCount(0, 0, 330, 'unit');

    expect(result.fullBottles).toBe(0);
    expect(result.leftoverMl).toBe(0);
    expect(result.netBottles).toBe(0);
  });

  it('throws when fullBottles is negative', () => {
    expect(() => normalizeCount(-1, 0, 750, 'fractional')).toThrow();
  });

  it('throws when leftoverMl is negative', () => {
    expect(() => normalizeCount(0, -1, 750, 'fractional')).toThrow();
  });

  it('throws when capacityMl is not positive', () => {
    expect(() => normalizeCount(1, 0, 0, 'fractional')).toThrow();
  });
});
