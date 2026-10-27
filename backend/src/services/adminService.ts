import { Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { BodyRegion, Exercise, ExerciseContraindication, ExerciseRegion, User } from '../models';
import { UserRole } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { AdminExerciseQuery, CreateExerciseInput, UpdateExerciseInput } from '../validators/admin.validators';

const includes = (region?: string) => [
  {
    model: BodyRegion,
    as: 'regions',
    attributes: ['id', 'code', 'name'],
    through: { attributes: [] },
    required: !!region,
    ...(region ? { where: { code: region } } : {}),
  },
  { model: ExerciseContraindication, as: 'contraindications', attributes: ['condition'] },
];

// Uzman paneli: onaylı + onaysız tüm egzersizler
export async function listExercises(filters: AdminExerciseQuery) {
  const where: WhereOptions = {};
  if (filters.approved !== undefined) Object.assign(where, { approved: filters.approved });
  return Exercise.findAll({ where, include: includes(filters.region), order: [['id', 'ASC']] });
}

async function getExerciseOrFail(id: number) {
  const exercise = await Exercise.findByPk(id, { include: includes() });
  if (!exercise) throw ApiError.notFound('Egzersiz bulunamadı');
  return exercise;
}

async function writeRelations(
  exerciseId: number,
  data: { regionCodes?: string[]; contraindications?: string[] },
  transaction: Transaction,
) {
  if (data.regionCodes) {
    const regions = await BodyRegion.findAll({ where: { code: data.regionCodes }, transaction });
    if (regions.length !== new Set(data.regionCodes).size) throw ApiError.badRequest('Bilinmeyen bölge kodu');
    await ExerciseRegion.destroy({ where: { exerciseId }, transaction });
    await ExerciseRegion.bulkCreate(
      regions.map((r) => ({ exerciseId, regionId: r.id })),
      { transaction },
    );
  }
  if (data.contraindications) {
    await ExerciseContraindication.destroy({ where: { exerciseId }, transaction });
    const unique = [...new Set(data.contraindications)];
    await ExerciseContraindication.bulkCreate(
      unique.map((condition) => ({ exerciseId, condition })),
      { transaction },
    );
  }
}

// Yeni egzersiz onaysız başlar; kullanıcıya ancak uzman onayından sonra görünür.
export async function createExercise(input: CreateExerciseInput) {
  const { regionCodes, contraindications, ...fields } = input;
  const id = await sequelize.transaction(async (transaction) => {
    const exercise = await Exercise.create(
      { ...fields, videoUrl: fields.videoUrl ?? null, approved: false, approvedBy: null },
      { transaction },
    );
    await writeRelations(exercise.id, { regionCodes, contraindications }, transaction);
    return exercise.id;
  });
  return getExerciseOrFail(id);
}

// Güvenlik: onaylı içerik değişince yeniden uzman onayı gerekir.
export async function updateExercise(id: number, input: UpdateExerciseInput) {
  const exercise = await getExerciseOrFail(id);
  const { regionCodes, contraindications, ...fields } = input;

  // Kısmi güncellemede mevcut değerlerle birleştirip min ≤ max kontrolü
  const merged = { ...exercise.get({ plain: true }), ...fields };
  for (const k of ['sets', 'reps', 'duration'] as const) {
    if (merged[`${k}Min`] > merged[`${k}Max`]) {
      throw ApiError.badRequest(`${k}Max, ${k}Min değerinden küçük olamaz`);
    }
  }

  await sequelize.transaction(async (transaction) => {
    await exercise.update({ ...fields, approved: false, approvedBy: null }, { transaction });
    await writeRelations(id, { regionCodes, contraindications }, transaction);
  });
  return getExerciseOrFail(id);
}

export async function setApproval(id: number, approved: boolean, approverId: number) {
  const exercise = await getExerciseOrFail(id);
  await exercise.update({ approved, approvedBy: approved ? approverId : null });
  return getExerciseOrFail(id);
}

// Kullanıcı listesi: yalnızca hesap bilgisi, sağlık verisi yok
export async function listUsers() {
  return User.findAll({ attributes: ['id', 'email', 'role', 'createdAt'], order: [['id', 'ASC']] });
}

export async function updateUserRole(actorId: number, userId: number, role: UserRole) {
  if (actorId === userId) throw ApiError.badRequest('Kendi rolünüzü değiştiremezsiniz');
  const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'createdAt'] });
  if (!user) throw ApiError.notFound('Kullanıcı bulunamadı');
  await user.update({ role });
  return user;
}
