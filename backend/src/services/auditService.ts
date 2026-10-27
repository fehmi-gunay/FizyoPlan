import { Op, WhereOptions } from 'sequelize';
import { AuditLog, User } from '../models';
import type { AuditAction } from '../models/AuditLog';
import type { AuditQuery } from '../validators/admin.validators';

// İsteği yapanın IP / tarayıcı bilgisi (controller'dan gelir)
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

interface LogInput extends RequestContext {
  action: AuditAction;
  userId?: number | null;
  email?: string | null;
  meta?: Record<string, unknown> | null;
}

// Kayıt yazılamazsa asıl işlem bozulmaz. Sağlık verisi buraya yazılmaz.
export async function logEvent(input: LogInput): Promise<void> {
  try {
    await AuditLog.create({
      action: input.action,
      userId: input.userId ?? null,
      email: input.email ?? null,
      ip: input.ip?.slice(0, 45) ?? null,
      userAgent: input.userAgent?.slice(0, 255) ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.error('Aktivite kaydı yazılamadı:', err instanceof Error ? err.message : err);
  }
}

// KVKK: hesap silinince geçmiş kayıtlarda e-posta da kalmasın (userId FK ile boşalır)
export async function anonymizeUser(userId: number): Promise<void> {
  await AuditLog.update({ email: null }, { where: { userId } });
}

export async function listLogs(q: AuditQuery) {
  const where: WhereOptions = {};
  if (q.action) Object.assign(where, { action: q.action });
  if (q.userId) Object.assign(where, { userId: q.userId });
  if (q.email) Object.assign(where, { email: { [Op.like]: `%${q.email}%` } });
  if (q.from || q.to) {
    Object.assign(where, {
      createdAt: {
        ...(q.from ? { [Op.gte]: q.from } : {}),
        ...(q.to ? { [Op.lte]: q.to } : {}),
      },
    });
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'role'] }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: q.pageSize,
    offset: (q.page - 1) * q.pageSize,
  });
  return { logs: rows, page: q.page, pageSize: q.pageSize, total: count };
}
