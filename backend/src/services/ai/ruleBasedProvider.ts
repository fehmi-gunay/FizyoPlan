import { clinicalConfig, DIFFICULTY_ORDER } from '../../config/clinical';
import { AiProvider, CandidateExercise, SuggestionInput } from './types';

const HIGH_PAIN = 5;

// Ağrı yüksekse alt sınırla başla, değilse aralığın ortasından; haftalık planda 4. günden sonra hafif artış.
function dose(min: number, max: number, severity: number, day: number): number {
  const base = severity >= HIGH_PAIN ? min : Math.floor((min + max) / 2);
  const progressed = severity < HIGH_PAIN && day >= 4 ? base + 1 : base;
  return Math.min(Math.max(progressed, min), max);
}

function pickForDay(input: SuggestionInput, day: number) {
  const items = [];
  const usedToday = new Set<number>();
  // Önce en çok ağrıyan bölge
  const regions = [...input.painRegions].sort((a, b) => b.severity - a.severity);

  for (const region of regions) {
    const pool = input.candidates
      .filter((e) => e.regionCodes.includes(region.regionCode) && !usedToday.has(e.id))
      .sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty) || a.id - b.id);
    if (pool.length === 0) continue;

    const count = Math.min(clinicalConfig.maxExercisesPerRegion, pool.length);
    for (let i = 0; i < count; i++) {
      // Günler arasında çeşitlilik için havuzda kaydır
      const e: CandidateExercise = pool[(day - 1 + i) % pool.length];
      if (usedToday.has(e.id) || items.length >= clinicalConfig.maxItemsPerDay) continue;
      usedToday.add(e.id);
      items.push({
        exerciseId: e.id,
        day,
        sets: dose(e.setsMin, e.setsMax, region.severity, day),
        reps: dose(e.repsMin, e.repsMax, region.severity, day),
        durationSec: dose(e.durationMin, e.durationMax, region.severity, day),
      });
    }
  }
  return items;
}

// AI seçilene kadar kullanılan deterministik öneri üretici.
export const ruleBasedProvider: AiProvider = {
  name: 'rule-based',
  async suggest(input) {
    const items = [];
    for (let day = 1; day <= input.days; day++) items.push(...pickForDay(input, day));
    return { items };
  },
};
