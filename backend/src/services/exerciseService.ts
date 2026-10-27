import { WhereOptions } from 'sequelize';
import { BodyRegion, Exercise, ExerciseContraindication } from '../models';

// Kullanıcıya yalnızca uzman onaylı (approved=true) egzersizler gösterilir.
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

export async function listExercises(filters: { region?: string; difficulty?: string }) {
  const where: WhereOptions = { approved: true };
  if (filters.difficulty) Object.assign(where, { difficulty: filters.difficulty });

  return Exercise.findAll({ where, include: includes(filters.region), order: [['id', 'ASC']] });
}

export async function getExercise(id: number) {
  return Exercise.findOne({ where: { id, approved: true }, include: includes() });
}
