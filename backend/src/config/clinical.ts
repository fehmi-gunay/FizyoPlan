import type { Difficulty } from '../models/Exercise';

// Klinik kurallar ve eşikler.
// NOT: TÜM DEĞERLER TASLAKTIR; uzman fizyoterapist / danışman onayıyla güncellenecek.
export const clinicalConfig = {
  // Denklem 2: egzersiz sonrası ağrı a ≥ θa veya zorluk z ≥ θz ise plan askıya alınır
  painThreshold: 7, // θa (0-10)
  difficultyThreshold: 9, // θz (1-10)

  // Risk değerlendirmesi: bu sınırların dışı uzman yönlendirmesi alır
  minAge: 18,
  maxAge: 75,
  referralPainSeverity: 8, // herhangi bir bölgede ağrı ≥ bu değer
  minBmi: 16,
  maxBmi: 40,

  // Ağrı şiddetine göre izin verilen en yüksek zorluk (şiddet ≥ eşik → o zorluk)
  difficultyBySeverity: [
    { minSeverity: 6, maxDifficulty: 'easy' },
    { minSeverity: 3, maxDifficulty: 'medium' },
    { minSeverity: 0, maxDifficulty: 'hard' },
  ] as { minSeverity: number; maxDifficulty: Difficulty }[],
  sedentaryMaxDifficulty: 'medium' as Difficulty,

  // Plan üretimi
  maxExercisesPerRegion: 2,
  maxItemsPerDay: 6,
  aiTimeoutMs: 10_000,
};

// Ankette sorulacak kırmızı bayrak kodları (herhangi biri işaretliyse plan üretilmez).
// Listede olmayan bir kod gelirse de güvenli tarafta kalınır ve kullanıcı yönlendirilir.
export const RED_FLAGS = [
  'unexplained_weight_loss', // açıklanamayan kilo kaybı
  'night_pain', // geceleri dinmeyen ağrı
  'numbness_weakness', // kol/bacakta uyuşma, güç kaybı
  'bladder_bowel_dysfunction', // idrar/dışkı kontrol kaybı
  'recent_trauma', // yakın zamanda düşme/kaza
  'fever', // ağrıyla birlikte ateş
  'cancer_history', // kanser öyküsü
  'chest_pain', // göğüs ağrısı / nefes darlığı
] as const;

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
