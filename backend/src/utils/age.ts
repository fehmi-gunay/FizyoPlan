export function ageFrom(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// AI'a kesin yaş yerine aralık gönderilir (veri minimizasyonu): 18-29, 30-39, ...
export function ageRange(age: number): string {
  if (age < 30) return '18-29';
  const start = Math.floor(age / 10) * 10;
  return `${start}-${start + 9}`;
}
