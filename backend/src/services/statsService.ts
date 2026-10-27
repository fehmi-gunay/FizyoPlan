import { col, fn, Op } from 'sequelize';
import { AuditLog, Exercise, HealthProfile, Plan, SessionFeedback, User } from '../models';
import type { PlanStatus } from '../models/Plan';
import type { UserRole } from '../models/User';

const DAY = 86_400_000;

async function countBy<K extends string>(model: typeof User | typeof Plan, field: string, keys: readonly K[]) {
  const rows = (await (model as typeof User).findAll({
    attributes: [field, [fn('COUNT', col('id')), 'count']],
    group: [field],
    raw: true,
  })) as unknown as Record<string, string | number>[];
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const r of rows) if (keys.includes(r[field] as K)) out[r[field] as K] = Number(r.count);
  return out;
}

// Yönetim paneli özeti: yalnızca sayılar, kişisel veri yok
export async function getStats() {
  const now = Date.now();
  const last7 = new Date(now - 7 * DAY);
  const last24 = new Date(now - DAY);

  const [
    byRole,
    usersTotal,
    newUsers,
    profiles,
    planStatus,
    feedback7,
    suspensions7,
    approved,
    pending,
    loginOk7,
    loginFail7,
    login24,
  ] = await Promise.all([
    countBy<UserRole>(User, 'role', ['user', 'physio', 'admin']),
    User.count(),
    User.count({ where: { createdAt: { [Op.gte]: last7 } } }),
    HealthProfile.count(),
    countBy<PlanStatus>(Plan, 'status', ['draft', 'active', 'suspended', 'completed']),
    SessionFeedback.count({ where: { createdAt: { [Op.gte]: last7 } } }),
    Plan.count({ where: { suspendedAt: { [Op.gte]: last7 } } }),
    Exercise.count({ where: { approved: true } }),
    Exercise.count({ where: { approved: false } }),
    AuditLog.count({ where: { action: 'login_success', createdAt: { [Op.gte]: last7 } } }),
    AuditLog.count({ where: { action: 'login_failed', createdAt: { [Op.gte]: last7 } } }),
    AuditLog.count({ where: { action: 'login_success', createdAt: { [Op.gte]: last24 } } }),
  ]);

  return {
    users: { total: usersTotal, byRole, newLast7Days: newUsers },
    profiles: { total: profiles },
    plans: { byStatus: planStatus },
    feedback: { last7Days: feedback7, suspensionsLast7Days: suspensions7 },
    exercises: { approved, pending },
    logins: { successLast7Days: loginOk7, failedLast7Days: loginFail7, last24h: login24 },
  };
}
