import { col, fn, Op, WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { clinicalConfig, DIFFICULTY_ORDER } from '../config/clinical';
import { BodyRegion, Exercise, ExerciseContraindication, Plan, PlanItem, SessionFeedback } from '../models';
import type { RegionCode } from '../models/BodyRegion';
import type { Difficulty } from '../models/Exercise';
import type { ActivityLevel } from '../models/HealthProfile';
import { ApiError } from '../utils/ApiError';
import { ageFrom, ageRange } from '../utils/age';
import { GeneratePlanInput, ListPlansQuery } from '../validators/plan.validators';
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
        include: [
          { model: Exercise, as: 'exercise', attributes: ['id', 'title', 'description', 'videoUrl', 'difficulty'] },
          { model: SessionFeedback, as: 'feedback', attributes: ['id', 'pain', 'difficulty', 'createdAt'] },
        ],
      },
    ],
    order: [
      [{ model: PlanItem, as: 'items' }, 'day', 'ASC'],
      [{ model: PlanItem, as: 'items' }, 'id', 'ASC'],
      [{ model: PlanItem, as: 'items' }, { model: SessionFeedback, as: 'feedback' }, 'createdAt', 'ASC'],
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
    await plan.update({ status: 'active', activatedAt: new Date() }, { transaction });
  });
  return getPlan(userId, planId);
}

// Planlarım: özet liste (kalemler olmadan, kalem sayısıyla), yeniden eskiye
export async function listPlans(userId: number, filters: ListPlansQuery) {
  const where: WhereOptions = { userId };
  if (filters.status) Object.assign(where, { status: filters.status });
  if (filters.type) Object.assign(where, { type: filters.type });

  const plans = await Plan.findAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
  if (plans.length === 0) return [];

  const counts = (await PlanItem.findAll({
    attributes: ['planId', [fn('COUNT', col('id')), 'count']],
    where: { planId: plans.map((p) => p.id) },
    group: ['planId'],
    raw: true,
  })) as unknown as { planId: number; count: number | string }[];
  const countByPlan = new Map(counts.map((c) => [c.planId, Number(c.count)]));

  return plans.map((p) => ({ ...p.toJSON(), itemCount: countByPlan.get(p.id) ?? 0 }));
}

export async function getActivePlan(userId: number) {
  const plan = await Plan.findOne({ where: { userId, status: 'active' }, attributes: ['id'] });
  return plan ? getPlan(userId, plan.id) : null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Haftalık planda gün indeksi aktif edildiği günden itibaren döner: ((gün farkı % 7) + 1)
function currentDay(plan: Plan): number {
  if (plan.type === 'daily') return 1;
  const start = startOfDay(plan.activatedAt ?? (plan.get('createdAt') as Date));
  const diff = Math.round((startOfDay(new Date()).getTime() - start.getTime()) / 86_400_000);
  return (((diff % 7) + 7) % 7) + 1;
}

// Bugünün egzersizleri + bugün geri bildirim verilmiş mi (completed)
export async function getToday(userId: number, dayOverride?: number) {
  const plan = await Plan.findOne({ where: { userId, status: 'active' } });
  if (!plan) return { plan: null, day: null, items: [] };

  const day = plan.type === 'daily' ? 1 : (dayOverride ?? currentDay(plan));
  const items = await PlanItem.findAll({
    where: { planId: plan.id, day },
    attributes: { exclude: ['planId'] },
    include: [
      { model: Exercise, as: 'exercise', attributes: ['id', 'title', 'description', 'videoUrl', 'difficulty'] },
      {
        model: SessionFeedback,
        as: 'feedback',
        attributes: ['id', 'pain', 'difficulty', 'createdAt'],
        required: false,
        where: { createdAt: { [Op.gte]: startOfDay(new Date()) } },
      },
    ],
    order: [['id', 'ASC']],
  });

  return {
    plan: { id: plan.id, type: plan.type, status: plan.status, activatedAt: plan.activatedAt },
    day,
    items: items.map((i) => {
      const { feedback, ...rest } = i.toJSON() as any;
      return { ...rest, completed: feedback.length > 0, todayFeedback: feedback };
    }),
  };
}

// Askıdaki plan için yeniden değerlendirme: risk uygunsa plan kapanır, yeni plan üretilebilir
export async function reassessPlan(userId: number, planId: number) {
  const plan = await Plan.findOne({ where: { id: planId, userId } });
  if (!plan) throw ApiError.notFound('Plan bulunamadı');
  if (plan.status !== 'suspended') throw ApiError.conflict('Yalnızca askıya alınmış plan yeniden değerlendirilebilir');

  const { profile, risk } = await loadRiskContext(userId);
  // Askıya alınma ağrı/zorluk bildirimiyle oldu; kullanıcı güncel durumunu anketle yeniden bildirmeli
  const surveyUpdated = profile && plan.suspendedAt && new Date(profile.updatedAt) > plan.suspendedAt;
  if (!surveyUpdated) {
    return {
      canGenerate: false,
      riskLevel: 'unassessable' as const,
      reasons: ['Plan askıya alındıktan sonra sağlık anketini güncel ağrı durumunuzla yeniden doldurun'],
    };
  }
  if (risk.level !== 'ok') {
    return { canGenerate: false, riskLevel: risk.level, reasons: risk.reasons };
  }

  await plan.update({ status: 'completed' });
  return { canGenerate: true, message: 'Değerlendirme uygun. Güncel bilgilerinizle yeni bir plan oluşturabilirsiniz.' };
}
