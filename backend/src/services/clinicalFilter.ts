import type { SuggestedItem } from '../validators/plan.validators';
import type { CandidateExercise } from './ai/types';

export interface LibraryEntry extends CandidateExercise {
  contraindications: string[];
}

export interface RejectedItem {
  exerciseId: number;
  day: number;
  reason: string;
}

const within = (v: number, min: number, max: number) => v >= min && v <= max;

// Klinik doğrulama (Denklem 1): bir öneri ancak
//   e ∈ onaylı kütüphane (kullanıcıya uygun aday kümesi) VE
//   K(e) ∩ kullanıcı sağlık durumu = ∅ VE
//   set/tekrar/süre egzersizin sınırları içindeyse kabul edilir.
export function clinicalFilter(items: SuggestedItem[], library: Map<number, LibraryEntry>, userConditions: string[]) {
  const conditions = new Set(userConditions.map((c) => c.toLowerCase()));
  const accepted: SuggestedItem[] = [];
  const rejected: RejectedItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const reject = (reason: string) => rejected.push({ exerciseId: item.exerciseId, day: item.day, reason });
    const e = library.get(item.exerciseId);

    if (!e) {
      reject('Onaylı kütüphanede / uygun adaylar arasında değil');
    } else if (e.contraindications.some((k) => conditions.has(k.toLowerCase()))) {
      reject('Kontrendikasyon ile kesişiyor');
    } else if (
      !within(item.sets, e.setsMin, e.setsMax) ||
      !within(item.reps, e.repsMin, e.repsMax) ||
      !within(item.durationSec, e.durationMin, e.durationMax)
    ) {
      reject('Set/tekrar/süre sınırların dışında');
    } else if (seen.has(`${item.day}:${item.exerciseId}`)) {
      reject('Aynı gün tekrar eden egzersiz');
    } else {
      seen.add(`${item.day}:${item.exerciseId}`);
      accepted.push(item);
    }
  }
  return { accepted, rejected };
}
