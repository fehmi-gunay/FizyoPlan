// Anket ve profil ekranlarında kullanılan yardımcılar

// Backend egzersiz kontrendikasyon kodlarıyla eşleşen, kullanıcıya anlaşılır tanı seçenekleri
export const CONDITION_OPTIONS: { code: string; label: string }[] = [
  { code: 'akut_bel_fitigi', label: 'Akut bel fıtığı' },
  { code: 'servikal_disk_hernisi_akut', label: 'Akut boyun fıtığı' },
  { code: 'omuz_cikigi_akut', label: 'Yakın zamanda omuz çıkığı' },
  { code: 'rotator_kilif_yirtigi_akut', label: 'Rotator manşet yırtığı' },
  { code: 'akut_diz_siskinligi', label: 'Dizde akut şişlik' },
];

export const MIN_AGE = 18;

export function ageFrom(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function bmi(heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiLabel(value: number): string {
  if (value < 18.5) return 'Zayıf';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Fazla kilolu';
  return 'Obez';
}

// Ağrı şiddeti için sözel karşılık + yüz ifadesi (ekran okuyucuya sözel kısım okunur)
export function painInfo(severity: number): { label: string; face: string } {
  if (severity === 0) return { label: 'Ağrı yok', face: '😀' };
  if (severity <= 3) return { label: 'Hafif ağrı', face: '🙂' };
  if (severity <= 6) return { label: 'Orta ağrı', face: '😐' };
  if (severity <= 8) return { label: 'Şiddetli ağrı', face: '😣' };
  return { label: 'Çok şiddetli ağrı', face: '😫' };
}

// Backend: clinicalConfig.referralPainSeverity
export const REFERRAL_PAIN = 8;

// ?donus= parametresi yalnızca uygulama içi adres olabilir (açık yönlendirme engeli)
export function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}
