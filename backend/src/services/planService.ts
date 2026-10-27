import { sequelize } from '../config/database';
import { clinicalConfig, DIFFICULTY_ORDER } from '../config/clinical';
import { BodyRegion, Exercise, ExerciseContraindication, Plan, PlanItem } from '../models';
import type { RegionCode } from '../models/BodyRegion';
import type { Difficulty } from '../models/Exercise';
import type { ActivityLevel } from '../models/HealthProfile';
import { ApiError } from '../utils/ApiError';
import { ageFrom, ageRange } from '../utils/age';
import { GeneratePlanInput } from '../validators/plan.validators';
import { requestSuggestion } from './aiService';
import { clinicalFilter, LibraryEntry } from './clinicalFilter';
import * as profileService from './profileService';
import { assessRisk } from './riskService';

const DAYS = { daily: 1, weekly: 7 } as const;

function maxDifficultyFor(severity: number, activityLevel: ActivityLevel): Difficulty {
  const rule = clinicalConfig.difficultyBySeverity.find((r) => severity >= r.minSeverity)!;
  let max = rule.maxDifficulty;
  if (activityLevel === 'sedentary' && DIFFICULTY_ORDER.indexOf(max) > DIFFICULTY_ORDER.indexOf(clinicalConfig.sedentaryMaxDifficulty)) {
    max = clinicalConfig.sedentaryMaxDifficulty;
  }
  return max;
}

// Adım 3: kullanıcının ağrı bölgelerine uyan, onaylı, kontrendikasyonsuz ve zorluk sınırı içindeki egzersizler.
async function selectCandidates(
  painRegions: { regionCode: RegionCode; severity: number }[],
  activityLevel: ActivityLevel,
  userConditions: string[],
): Promise<Map<number, LibraryEntry>> {
  const severityByRegion = new Map(painRegions.map((p) => [p.regionCode, p.severity]));
  const conditions = new Set(userConditions.map((c) => c.toLowerCase()));

  const exercises = await Exercise.findAll({
    where: { approved: true },
    include: [
      {
        model: BodyRegion,
        as: 'regions',
        attributes: ['code'],
        through: { attributes: [] },
        where: { code: [...severityByRegion.keys()] },
      },
      { model: ExerciseContraindication, as: 'contraindications', attributes: ['condition'] },
    ],
  });

  const library = new Map<number, LibraryEntry>();
  for (const e of exercises) {
    const regionCodes = ((e as any).regions as BodyRegion[]).map((r) => r.code);
    const contraindications = ((e as any).contraindications as ExerciseContraindication[]).map((c) => c.condition);
    if (contraindications.some((k) => conditions.has(k.toLowerCase()))) continue;

    // Birden çok bölgeye uyuyorsa en yüksek ağrı şiddeti esas alınır (temkinli)
    const severity = Math.max(...regionCodes.map((c) => severityByRegion.get(c) ?? 0));
    const maxDifficulty = maxDifficultyFor(severity, activityLevel);
    if (DIFFICULTY_ORDER.indexOf(e.difficulty) > DIFFICULTY_ORDER.indexOf(maxDifficulty)) continue;

    library.set(e.id, {
      id: e.id,
      regionCodes,
      difficulty: e.difficulty,
      setsMin: e.setsMin,
      setsMax: e.setsMax,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      durationMin: e.durationMin,
      durationMax: e.durationMax,
      contraindications,
    });
  }
  return library;
}

async function loadRiskContext(userId: number) {
  const profile = await profileService.getProfile(userId);
  const risk = assessRisk(profile);
  return { profile, risk };
}

// PDF Şekil 1 akışı: risk → aday seçimi → öneri → şema kontrolü → klinik doğrulama → kayıt (taslak)
export async function generatePlan(userId: number, input: GeneratePlanInput) {
  const { profile, risk } = await loadRiskContext(userId);
  if (!profile || risk.level !== 'ok') {
    return { outcome: 'referral' as const, riskLevel: risk.level, reasons: risk.reasons };
  }

  const painRegions = profile.painRegions
    .filter((p) => p.severity > 0 && p.regionCode)
    .map((p) => ({ regionCode: p.regionCode as RegionCode, severity: p.severity }));
  const userConditions = [...profile.conditions, ...profile.redFlags];
  const days = DAYS[input.type];

  const library = await selectCandidates(painRegions, profile.activityLevel, userConditions);
  if (library.size === 0) {
    throw ApiError.unprocessable('NO_SUITABLE_EXERCISES', 'Size uygun onaylı egzersiz bulunamadı, plan oluşturulamadı');
  }

  const suggestion = await requestSuggestion({
    planType: input.type,
    days,
    ageRange: ageRange(ageFrom(profile.birthDate)),
    activityLevel: profile.activityLevel,
    painRegions,
    candidates: [...library.values()].map(({ contraindications: _c, ...c }) => c),
  });

  const { accepted, rejected } = clinicalFilter(suggestion.items, library, userConditions);
  if (accepted.length === 0) {
    throw ApiError.unprocessable('NO_SUITABLE_PLAN', 'Klinik kurallara uygun öneri çıkmadı, plan oluşturulamadı');
  }

  const planId = await sequelize.transaction(async (transaction) => {
    const plan = await Plan.create({ userId, type: input.type }, { transaction });
    await PlanItem.bulkCreate(
      accepted.map((i) => ({ ...i, planId: plan.id })),
      { transaction },
    );
    return plan.id;
  });

  return { outcome: 'created' as const, plan: await getPlan(userId, planId), rejected };
}

export async function getPlan(userId: number, planId: number) {
  const plan = await Plan.findOne({
    where: { id: planId, userId },
    include: [
      {
        model: PlanItem,
        as: 'items',
        attributes: { exclude: ['planId'] },
        include: [{ model: Exercise, as: 'exercise', attributes: ['id', 'title', 'description', 'videoUrl', 'difficulty'] }],
      },
    ],
    order: [
      [{ model: PlanItem, as: 'items' }, 'day', 'ASC'],
      [{ model: PlanItem, as: 'items' }, 'id', 'ASC'],
    ],
  });
  if (!plan) throw ApiError.notFound('Plan bulunamadı');
  return plan;
}

// Kullanıcı onayı (adım 8): taslak plan aktif olur, önceki aktif plan tamamlanmış sayılır.
// Profil üretimden sonra değişmiş olabileceği için risk yeniden kontrol edilir.
export async function activatePlan(userId: number, planId: number) {
  const plan = await getPlan(userId, planId);
  if (plan.status !== 'draft') {
    throw ApiError.conflict('Yalnızca taslak durumundaki plan onaylanabilir');
  }

  const { risk } = await loadRiskContext(userId);
  if (risk.level !== 'ok') {
    throw ApiError.unprocessable('REFERRAL_REQUIRED', 'Güncel sağlık bilgilerinize göre uzman değerlendirmesi gerekiyor', risk.reasons);
  }

  await sequelize.transaction(async (transaction) => {
    await Plan.update({ status: 'completed' }, { where: { userId, status: 'active' }, transaction });
    await plan.update({ status: 'active' }, { transaction });
  });
  return getPlan(userId, planId);
}
