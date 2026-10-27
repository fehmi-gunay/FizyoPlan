import { describe, expect, it } from 'vitest';
import { assessRisk, RiskInput } from '../../src/services/riskService';

function birthDateForAge(age: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const base: RiskInput = {
  birthDate: birthDateForAge(30),
  heightCm: 175,
  weightKg: 72,
  redFlags: [],
  painRegions: [{ regionCode: 'lower_back', severity: 4 }],
};

describe('assessRisk', () => {
  it('uygun profil için ok döner', () => {
    expect(assessRisk(base)).toEqual({ level: 'ok', reasons: [] });
  });

  it('DECIMAL string kilo değerini kabul eder', () => {
    expect(assessRisk({ ...base, weightKg: '72.0' }).level).toBe('ok');
  });

  describe('değerlendirilemez', () => {
    it('profil yoksa', () => {
      expect(assessRisk(null).level).toBe('unassessable');
    });
    it('ağrı bölgesi yoksa', () => {
      expect(assessRisk({ ...base, painRegions: [] }).level).toBe('unassessable');
    });
    it('tüm bölgelerde şiddet 0 ise', () => {
      expect(assessRisk({ ...base, painRegions: [{ regionCode: 'knee', severity: 0 }] }).level).toBe('unassessable');
    });
    it('boy geçersizse (VKİ hesaplanamaz)', () => {
      expect(assessRisk({ ...base, heightCm: 0 }).level).toBe('unassessable');
    });
  });

  describe('riskli', () => {
    it.each<[string, Partial<RiskInput>]>([
      ['kırmızı bayrak', { redFlags: ['night_pain'] }],
      ['bilinmeyen kırmızı bayrak kodu', { redFlags: ['bilinmeyen_kod'] }],
      ['18 yaş altı', { birthDate: birthDateForAge(17) }],
      ['75 yaş üstü', { birthDate: birthDateForAge(76) }],
      ['VKİ < 16', { weightKg: 45 }],
      ['VKİ > 40', { weightKg: 130 }],
      ['ağrı ≥ 8', { painRegions: [{ regionCode: 'knee', severity: 8 }] }],
    ])('%s', (_name, override) => {
      const result = assessRisk({ ...base, ...override });
      expect(result.level).toBe('risky');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('birden çok nedeni birlikte listeler', () => {
      const result = assessRisk({ ...base, redFlags: ['fever'], painRegions: [{ regionCode: 'knee', severity: 9 }] });
      expect(result.reasons).toHaveLength(2);
    });
  });

  it('sınır değerleri: 75 yaş ve ağrı 7 hâlâ ok', () => {
    const result = assessRisk({ ...base, birthDate: birthDateForAge(75), painRegions: [{ regionCode: 'knee', severity: 7 }] });
    expect(result.level).toBe('ok');
  });
});
