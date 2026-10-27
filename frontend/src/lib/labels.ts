import type { ActivityLevel, Difficulty, PlanStatus, PlanType, RegionCode, Role } from '../types/api';

// Ekranda gösterilen Türkçe karşılıklar (tek yerde)

export const REGION_LABELS: Record<RegionCode, string> = {
  neck: 'Boyun',
  shoulder: 'Omuz',
  lower_back: 'Bel',
  knee: 'Diz',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: 'Hareketsiz', hint: 'Günün çoğunu oturarak geçiriyorum' },
  light: { label: 'Az hareketli', hint: 'Kısa yürüyüşler, hafif ev işleri' },
  moderate: { label: 'Orta hareketli', hint: 'Haftada birkaç gün egzersiz / uzun yürüyüş' },
  active: { label: 'Çok hareketli', hint: 'Düzenli spor veya fiziksel iş' },
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Onay bekliyor',
  active: 'Aktif',
  suspended: 'Askıya alındı',
  completed: 'Tamamlandı',
};

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
};

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Kullanıcı',
  physio: 'Fizyoterapist',
  admin: 'Yönetici',
};

// Backend: src/config/clinical.ts RED_FLAGS ile aynı kodlar
export const RED_FLAG_QUESTIONS: { code: string; question: string }[] = [
  { code: 'unexplained_weight_loss', question: 'Son zamanlarda açıklanamayan kilo kaybı yaşadınız mı?' },
  { code: 'night_pain', question: 'Geceleri dinlenirken bile dinmeyen ağrınız var mı?' },
  { code: 'numbness_weakness', question: 'Kol veya bacaklarınızda uyuşma, karıncalanma ya da güç kaybı var mı?' },
  { code: 'bladder_bowel_dysfunction', question: 'İdrar veya dışkı kontrolünde sorun yaşıyor musunuz?' },
  { code: 'recent_trauma', question: 'Yakın zamanda düşme, kaza veya darbe yaşadınız mı?' },
  { code: 'fever', question: 'Ağrınızla birlikte ateşiniz var mı?' },
  { code: 'cancer_history', question: 'Kanser öykünüz var mı?' },
  { code: 'chest_pain', question: 'Göğüs ağrısı veya nefes darlığı yaşıyor musunuz?' },
];

// Backend: src/config/clinical.ts (Denklem 2) ile aynı tutulmalı – ağrı ≥ θa veya zorluk ≥ θz → plan askıya
export const PAIN_THRESHOLD = 7;
export const DIFFICULTY_THRESHOLD = 9;

export const DAY_NAMES =['1. Gün', '2. Gün', '3. Gün', '4. Gün', '5. Gün', '6. Gün', '7. Gün'];

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} dk ${s} sn` : `${m} dk`;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
