import request from 'supertest';
import app from '../src/app';
import { sequelize } from '../src/config/database';
import { BodyRegion, Exercise, ExerciseContraindication, ExerciseRegion, User, syncDatabase } from '../src/models';
import type { RegionCode } from '../src/models/BodyRegion';
import type { Difficulty } from '../src/models/Exercise';
import type { UserRole } from '../src/models/User';

export const api = () => request(app);

if (sequelize.getDatabaseName() !== 'fizyoterapi_test') {
  throw new Error(`Testler yalnızca fizyoterapi_test veritabanında çalışır (şu an: ${sequelize.getDatabaseName()})`);
}

type FixtureExercise = {
  title: string;
  region: RegionCode;
  difficulty: Difficulty;
  approved?: boolean;
  contraindications?: string[];
};

export const FIXTURE_EXERCISES: FixtureExercise[] = [
  { title: 'Test Pelvik Tilt', region: 'lower_back', difficulty: 'easy' },
  { title: 'Test Kedi-Deve', region: 'lower_back', difficulty: 'easy' },
  { title: 'Test Köprü', region: 'lower_back', difficulty: 'hard' },
  { title: 'Test Düz Bacak', region: 'knee', difficulty: 'easy' },
  { title: 'Test Duvar Squat', region: 'knee', difficulty: 'medium', contraindications: ['akut_diz'] },
  { title: 'Test Çene İçe Çekme', region: 'neck', difficulty: 'easy' },
  { title: 'Test Onaysız Boyun', region: 'neck', difficulty: 'easy', approved: false },
];

// Tabloları sıfırlar ve bölgeler + test egzersizlerini yükler.
export async function resetDb() {
  await syncDatabase({ force: true });
  const regions = await BodyRegion.bulkCreate([
    { code: 'neck', name: 'Boyun' },
    { code: 'shoulder', name: 'Omuz' },
    { code: 'lower_back', name: 'Bel' },
    { code: 'knee', name: 'Diz' },
  ]);
  const regionId = new Map(regions.map((r) => [r.code, r.id]));

  for (const f of FIXTURE_EXERCISES) {
    const e = await Exercise.create({
      title: f.title,
      description: 'Test açıklaması',
      videoUrl: null,
      difficulty: f.difficulty,
      setsMin: 2,
      setsMax: 3,
      repsMin: 10,
      repsMax: 15,
      durationMin: 5,
      durationMax: 10,
      approved: f.approved ?? true,
      approvedBy: null,
    });
    await ExerciseRegion.create({ exerciseId: e.id, regionId: regionId.get(f.region)! });
    for (const condition of f.contraindications ?? []) {
      await ExerciseContraindication.create({ exerciseId: e.id, condition });
    }
  }
}

export async function closeDb() {
  await sequelize.close();
}

let counter = 0;
export const PASSWORD = 'parola1234';

// Kayıt olur ve token döner. Rol her istekte DB'den okunduğu için admin/physio rolü doğrudan DB'de verilir.
export async function createUser(role: UserRole = 'user') {
  const email = `kullanici${Date.now()}_${counter++}@test.com`;
  const reg = await api().post('/api/auth/register').send({ email, password: PASSWORD });
  if (reg.status !== 201) throw new Error(`Kayıt başarısız: ${reg.status} ${JSON.stringify(reg.body)}`);

  if (role !== 'user') await User.update({ role }, { where: { id: reg.body.user.id } });
  return { id: reg.body.user.id as number, email, token: reg.body.token as string };
}

export const validProfile = {
  birthDate: '1995-05-10',
  heightCm: 175,
  weightKg: 72,
  activityLevel: 'moderate',
  redFlags: [] as string[],
  conditions: [] as string[],
  painRegions: [{ regionCode: 'lower_back', severity: 4 }] as { regionCode: string; severity: number }[],
};

export async function saveProfile(token: string, overrides: Partial<typeof validProfile> = {}) {
  return api()
    .put('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validProfile, ...overrides });
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
