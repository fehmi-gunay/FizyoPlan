import { sequelize } from '../config/database';
import { clinicalConfig } from '../config/clinical';
import { Plan, PlanItem, SessionFeedback } from '../models';
import { ApiError } from '../utils/ApiError';
import { FeedbackInput } from '../validators/feedback.validators';

const SUSPEND_MESSAGE =
  'Bildirdiğiniz ağrı/zorluk güvenli sınırın üzerinde. Planınız askıya alındı; egzersizlere ara verin ve ' +
  'yeniden değerlendirme yapın. Şikâyetiniz sürerse bir fizyoterapiste veya hekime başvurun.';

// Denklem 2: a ≥ θa veya z ≥ θz ise plan askıya alınır
export function exceedsThreshold(input: FeedbackInput): boolean {
  return input.pain >= clinicalConfig.painThreshold || input.difficulty >= clinicalConfig.difficultyThreshold;
}

export async function submitFeedback(userId: number, planItemId: number, input: FeedbackInput) {
  const item = await PlanItem.findByPk(planItemId);
  const plan = item ? await Plan.findOne({ where: { id: item.planId, userId } }) : null;
  // Başkasının plan kalemi için de 404 (varlığını belli etmemek için)
  if (!item || !plan) throw ApiError.notFound('Plan kalemi bulunamadı');
  if (plan.status !== 'active') throw ApiError.conflict('Geri bildirim yalnızca aktif plan için verilebilir');

  const suspended = exceedsThreshold(input);

  const feedback = await sequelize.transaction(async (transaction) => {
    const created = await SessionFeedback.create({ planItemId, ...input }, { transaction });
    if (suspended) await plan.update({ status: 'suspended', suspendedAt: new Date() }, { transaction });
    return created;
  });

  return {
    feedback,
    planStatus: plan.status,
    suspended,
    message: suspended ? SUSPEND_MESSAGE : 'Geri bildiriminiz kaydedildi',
  };
}
