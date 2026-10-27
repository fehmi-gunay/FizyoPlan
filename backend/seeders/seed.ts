import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/database';
import { BodyRegion, Exercise, ExerciseContraindication, ExerciseRegion, syncDatabase, User } from '../src/models';
import type { RegionCode } from '../src/models/BodyRegion';
import type { Difficulty } from '../src/models/Exercise';

type SeedExercise = {
  title: string;
  description: string;
  difficulty: Difficulty;
  sets: [number, number];
  reps: [number, number];
  duration: [number, number];
  contraindications: string[];
};

const regions: { code: RegionCode; name: string }[] = [
  { code: 'neck', name: 'Boyun' },
  { code: 'shoulder', name: 'Omuz' },
  { code: 'lower_back', name: 'Bel' },
  { code: 'knee', name: 'Diz' },
];

// NOT: Örnek içeriktir; gerçek set/tekrar/kontrendikasyon değerleri fizyoterapist onayı gerektirir.
const exercises: Record<RegionCode, SeedExercise[]> = {
  neck: [
    { title: 'Boyun Yana Esnetme', description: 'Dik oturun, kulağınızı omzunuza yaklaştırın ve bekleyin.', difficulty: 'easy', sets: [2, 3], reps: [3, 5], duration: [15, 30], contraindications: ['servikal_disk_hernisi_akut'] },
    { title: 'Çene İçe Çekme', description: 'Başı sabit tutup çeneyi içe doğru çekin.', difficulty: 'easy', sets: [2, 3], reps: [8, 12], duration: [5, 10], contraindications: [] },
    { title: 'Skapular Sıkma', description: 'Omuz bıçaklarını geriye ve aşağıya sıkın.', difficulty: 'medium', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: [] },
  ],
  shoulder: [
    { title: 'Sarkaç Egzersizi', description: 'Öne eğilip kolu gevşek sallayın.', difficulty: 'easy', sets: [2, 3], reps: [10, 15], duration: [30, 60], contraindications: [] },
    { title: 'Duvarda Kol Kaydırma', description: 'Kolları duvarda yukarı doğru kaydırın.', difficulty: 'medium', sets: [2, 3], reps: [8, 12], duration: [5, 10], contraindications: ['omuz_cikigi_akut'] },
    { title: 'Dış Rotasyon (Bantla)', description: 'Dirsek vücutta, bantı dışa doğru çekin.', difficulty: 'hard', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: ['rotator_kilif_yirtigi_akut'] },
  ],
  lower_back: [
    { title: 'Pelvik Tilt', description: 'Sırtüstü yatıp belinizi zemine bastırın.', difficulty: 'easy', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: [] },
    { title: 'Kedi-Deve', description: 'Dört ayak pozisyonunda sırtı kamburlaştırıp çukurlaştırın.', difficulty: 'easy', sets: [2, 3], reps: [8, 12], duration: [4, 8], contraindications: [] },
    { title: 'Köprü Egzersizi', description: 'Sırtüstü yatıp kalçayı yukarı kaldırın.', difficulty: 'medium', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: ['akut_bel_fitigi'] },
  ],
  knee: [
    { title: 'Düz Bacak Kaldırma', description: 'Sırtüstü bir bacağı düz tutup kaldırın.', difficulty: 'easy', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: [] },
    { title: 'Duvar Squat (Hafif)', description: 'Sırtı duvara verip dizleri hafif bükün.', difficulty: 'medium', sets: [2, 3], reps: [8, 12], duration: [10, 20], contraindications: ['akut_diz_siskinligi'] },
    { title: 'Topuk Kaydırma', description: 'Sırtüstü topuğu kalçaya doğru kaydırın.', difficulty: 'easy', sets: [2, 3], reps: [10, 15], duration: [5, 10], contraindications: [] },
  ],
};

async function seed() {
  // Tablolar yoksa oluşturur, varsa dokunmaz
  await syncDatabase();

  for (const r of regions) {
    const [region] = await BodyRegion.findOrCreate({ where: { code: r.code }, defaults: r });

    for (const e of exercises[r.code]) {
      const [exercise, created] = await Exercise.findOrCreate({
        where: { title: e.title },
        defaults: {
          title: e.title,
          description: e.description,
          videoUrl: null,
          difficulty: e.difficulty,
          setsMin: e.sets[0],
          setsMax: e.sets[1],
          repsMin: e.reps[0],
          repsMax: e.reps[1],
          durationMin: e.duration[0],
          durationMax: e.duration[1],
          approved: true,
          approvedBy: null,
        },
      });
      if (!created) continue;
      await ExerciseRegion.create({ exerciseId: exercise.id, regionId: region.id });
      for (const condition of e.contraindications) {
        await ExerciseContraindication.create({ exerciseId: exercise.id, condition });
      }
    }
  }

  await seedAdmin();
  console.log('Seed tamamlandı');
}

// Opsiyonel: .env'de SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD varsa admin hesabı oluşturur (varsa dokunmaz)
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD en az 12 karakter olmalı');

  const [, created] = await User.findOrCreate({
    where: { email },
    defaults: { email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' },
  });
  console.log(created ? `Admin hesabı oluşturuldu: ${email}` : `Admin hesabı zaten var: ${email}`);
}

seed()
  .catch((err) => {
    console.error('Seed hatası:', err);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
