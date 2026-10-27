import { describe, expect, it } from 'vitest';
import { clinicalConfig } from '../../src/config/clinical';
import { ruleBasedProvider } from '../../src/services/ai/ruleBasedProvider';
import { CandidateExercise, SuggestionInput } from '../../src/services/ai/types';
import { suggestionSchema } from '../../src/validators/plan.validators';

let nextId = 1;
const ex = (regionCodes: CandidateExercise['regionCodes'], difficulty: CandidateExercise['difficulty'] = 'easy'): CandidateExercise => ({
  id: nextId++,
  regionCodes,
  difficulty,
  setsMin: 2,
  setsMax: 4,
  repsMin: 8,
  repsMax: 12,
  durationMin: 5,
  durationMax: 15,
});

const candidates = [
  ex(['lower_back']),
  ex(['lower_back'], 'medium'),
  ex(['lower_back']),
  ex(['knee']),
  ex(['knee']),
  ex(['neck']),
  ex(['neck']),
  ex(['shoulder']),
  ex(['shoulder']),
];
const byId = new Map(candidates.map((c) => [c.id, c]));

const input = (over: Partial<SuggestionInput> = {}): SuggestionInput => ({
  planType: 'weekly',
  days: 7,
  ageRange: '30-39',
  activityLevel: 'moderate',
  painRegions: [{ regionCode: 'lower_back', severity: 3 }],
  candidates,
  ...over,
});

type Items = { items: { exerciseId: number; day: number; sets: number; reps: number; durationSec: number }[] };
const suggest = async (over: Partial<SuggestionInput> = {}) => (await ruleBasedProvider.suggest(input(over))) as Items;

describe('ruleBasedProvider', () => {
  it('şema kontrolünden geçen çıktı üretir', async () => {
    expect(suggestionSchema(7).safeParse(await suggest()).success).toBe(true);
  });

  it('haftalık planda 7 günün hepsini doldurur, günlükte sadece gün 1', async () => {
    const weekly = await suggest();
    expect(new Set(weekly.items.map((i) => i.day))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    const daily = await suggest({ planType: 'daily', days: 1 });
    expect(daily.items.length).toBeGreaterThan(0);
    expect(daily.items.every((i) => i.day === 1)).toBe(true);
  });

  it('set/tekrar/süre her zaman egzersiz sınırları içinde', async () => {
    for (const severity of [1, 4, 5, 7]) {
      const out = await suggest({ painRegions: [{ regionCode: 'lower_back', severity }] });
      for (const i of out.items) {
        const e = byId.get(i.exerciseId)!;
        expect(i.sets).toBeGreaterThanOrEqual(e.setsMin);
        expect(i.sets).toBeLessThanOrEqual(e.setsMax);
        expect(i.reps).toBeGreaterThanOrEqual(e.repsMin);
        expect(i.reps).toBeLessThanOrEqual(e.repsMax);
        expect(i.durationSec).toBeGreaterThanOrEqual(e.durationMin);
        expect(i.durationSec).toBeLessThanOrEqual(e.durationMax);
      }
    }
  });

  it('yüksek ağrıda alt sınırla başlar', async () => {
    const out = await suggest({ painRegions: [{ regionCode: 'lower_back', severity: 6 }] });
    for (const i of out.items) {
      const e = byId.get(i.exerciseId)!;
      expect([i.sets, i.reps, i.durationSec]).toEqual([e.setsMin, e.repsMin, e.durationMin]);
    }
  });

  it('sadece kullanıcının ağrı bölgesinden seçer ve bölge başına sınırı aşmaz', async () => {
    const out = await suggest({ planType: 'daily', days: 1 });
    expect(out.items.every((i) => byId.get(i.exerciseId)!.regionCodes.includes('lower_back'))).toBe(true);
    expect(out.items.length).toBeLessThanOrEqual(clinicalConfig.maxExercisesPerRegion);
  });

  it('günlük toplam maxItemsPerDay sınırını ve aynı gün tekrarı aşmaz', async () => {
    const out = await suggest({
      painRegions: [
        { regionCode: 'lower_back', severity: 3 },
        { regionCode: 'knee', severity: 3 },
        { regionCode: 'neck', severity: 3 },
        { regionCode: 'shoulder', severity: 3 },
      ],
    });
    for (let day = 1; day <= 7; day++) {
      const ids = out.items.filter((i) => i.day === day).map((i) => i.exerciseId);
      expect(ids.length).toBeLessThanOrEqual(clinicalConfig.maxItemsPerDay);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('aday yoksa boş liste döner', async () => {
    expect((await suggest({ candidates: [] })).items).toEqual([]);
  });
});
