import { clinicalConfig } from '../config/clinical';
import { ageFrom } from '../utils/age';

export type RiskLevel = 'ok' | 'risky' | 'unassessable';

export interface RiskInput {
  birthDate: string;
  heightCm: number;
  weightKg: number | string; // DECIMAL sütunu string dönebilir
  redFlags: string[];
  painRegions: { regionCode?: string; severity: number }[];
}

export interface RiskResult {
  level: RiskLevel;
  reasons: string[];
}

// Plan üretiminden önceki güvenlik kapısı: 'ok' dışındaki her sonuçta plan üretilmez,
// kullanıcı uzmana yönlendirilir. Sistem tanı koymaz; yalnızca güvenli tarafta kalır.
export function assessRisk(profile: RiskInput | null): RiskResult {
  if (!profile) return { level: 'unassessable', reasons: ['Sağlık anketi doldurulmamış'] };

  const reasons: string[] = [];
  const c = clinicalConfig;

  const painful = profile.painRegions.filter((p) => p.severity > 0);
  if (painful.length === 0) {
    return { level: 'unassessable', reasons: ['Ağrı bölgesi seçilmemiş'] };
  }

  if (profile.redFlags.length > 0) reasons.push('Kırmızı bayrak belirtisi bildirildi');

  const age = ageFrom(profile.birthDate);
  if (age < c.minAge) reasons.push(`Sistem ${c.minAge} yaş ve üzeri içindir`);
  if (age > c.maxAge) reasons.push(`${c.maxAge} yaş üzeri için uzman değerlendirmesi gerekir`);

  const heightM = profile.heightCm / 100;
  const bmi = Number(profile.weightKg) / (heightM * heightM);
  if (!Number.isFinite(bmi)) return { level: 'unassessable', reasons: ['Boy/kilo bilgisi geçersiz'] };
  if (bmi < c.minBmi || bmi > c.maxBmi) reasons.push('Vücut kitle indeksi güvenli aralığın dışında');

  if (painful.some((p) => p.severity >= c.referralPainSeverity)) {
    reasons.push(`Ağrı şiddeti ${c.referralPainSeverity}/10 veya üzerinde`);
  }

  return { level: reasons.length > 0 ? 'risky' : 'ok', reasons };
}
