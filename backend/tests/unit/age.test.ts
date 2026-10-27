import { describe, expect, it } from 'vitest';
import { ageFrom, ageRange } from '../../src/utils/age';

function yearsAgo(years: number, dayShift = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + dayShift);
  return d.toISOString().slice(0, 10);
}

describe('ageFrom', () => {
  it('doğum günü geçtiyse tam yaşı verir', () => {
    expect(ageFrom(yearsAgo(30, -1))).toBe(30);
  });
  it('doğum günü yarınsa bir eksik yaş verir', () => {
    expect(ageFrom(yearsAgo(30, 1))).toBe(29);
  });
});

describe('ageRange', () => {
  it.each([
    [18, '18-29'],
    [29, '18-29'],
    [30, '30-39'],
    [47, '40-49'],
    [75, '70-79'],
  ])('%i → %s', (age, range) => {
    expect(ageRange(age)).toBe(range);
  });
});
