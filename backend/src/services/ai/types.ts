import type { RegionCode } from '../../models/BodyRegion';
import type { Difficulty } from '../../models/Exercise';
import type { ActivityLevel } from '../../models/HealthProfile';
import type { PlanType } from '../../models/Plan';

// Öneri üreticiye giden veri: kimlik bilgisi yok, yalnızca onaylı egzersiz ID'leri ve sınırları.
export interface CandidateExercise {
  id: number;
  regionCodes: RegionCode[];
  difficulty: Difficulty;
  setsMin: number;
  setsMax: number;
  repsMin: number;
  repsMax: number;
  durationMin: number;
  durationMax: number;
}

export interface SuggestionInput {
  planType: PlanType;
  days: number;
  ageRange: string;
  activityLevel: ActivityLevel;
  painRegions: { regionCode: RegionCode; severity: number }[];
  candidates: CandidateExercise[];
}

// Gerçek AI (Aşama 8) ve kural tabanlı yedek bu arayüzü uygular.
// Çıktı `unknown` döner; güvenilmez kabul edilir ve şema + klinik kontrolden geçer.
export interface AiProvider {
  name: string;
  suggest(input: SuggestionInput): Promise<unknown>;
}
