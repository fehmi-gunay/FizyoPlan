import { describe, expect, it } from 'vitest';
import { clinicalFilter, LibraryEntry } from '../../src/services/clinicalFilter';

const entry: LibraryEntry = {
  id: 1,
  regionCodes: ['knee'],
  difficulty: 'easy',
  setsMin: 2,
  setsMax: 3,
  repsMin: 10,
  repsMax: 15,
  durationMin: 5,
  durationMax: 10,
  contraindications: ['akut_diz'],
};
const library = new Map([[1, entry]]);
const item = { exerciseId: 1, day: 1, sets: 2, reps: 10, durationSec: 5 };

describe('clinicalFilter (Denklem 1)', () => {
  it('tüm koşulları sağlayan öneriyi kabul eder', () => {
    expect(clinicalFilter([item], library, [])).toEqual({ accepted: [item], rejected: [] });
  });

  it('sınır değerlerini (max) kabul eder', () => {
    const atMax = { ...item, sets: 3, reps: 15, durationSec: 10 };
    expect(clinicalFilter([atMax], library, []).accepted).toEqual([atMax]);
  });

  it('kütüphanede olmayan egzersizi reddeder', () => {
    const { rejected } = clinicalFilter([{ ...item, exerciseId: 99 }], library, []);
    expect(rejected[0].reason).toMatch(/kütüphane/);
  });

  it('kontrendikasyonla kesişeni reddeder (büyük/küçük harf duyarsız)', () => {
    const { accepted, rejected } = clinicalFilter([item], library, ['AKUT_DIZ']);
    expect(accepted).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/Kontrendikasyon/);
  });

  it.each([
    ['set fazla', { sets: 4 }],
    ['set az', { sets: 1 }],
    ['tekrar fazla', { reps: 16 }],
    ['süre az', { durationSec: 4 }],
    ['süre fazla', { durationSec: 11 }],
  ])('sınır dışını reddeder: %s', (_name, override) => {
    const { rejected } = clinicalFilter([{ ...item, ...override }], library, []);
    expect(rejected[0].reason).toMatch(/sınır/);
  });

  it('aynı gün tekrar eden egzersizi reddeder, farklı günde kabul eder', () => {
    const { accepted, rejected } = clinicalFilter([item, item, { ...item, day: 2 }], library, []);
    expect(accepted).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatch(/Aynı gün/);
  });
});
