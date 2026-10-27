import { z } from 'zod';
import { AUDIT_ACTIONS } from '../models/AuditLog';
import { REGION_CODES } from './profile.validators';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const exerciseFields = {
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(5).max(5000),
  videoUrl: z.url('Geçerli bir video adresi girin').max(500).nullable().optional(),
  difficulty: z.enum(DIFFICULTIES),
  setsMin: z.number().int().min(1).max(20),
  setsMax: z.number().int().min(1).max(20),
  repsMin: z.number().int().min(1).max(100),
  repsMax: z.number().int().min(1).max(100),
  durationMin: z.number().int().min(1).max(3600), // saniye
  durationMax: z.number().int().min(1).max(3600),
  regionCodes: z.array(z.enum(REGION_CODES)).min(1, 'En az bir bölge seçin'),
  contraindications: z.array(z.string().trim().min(1).max(100)),
};

type Ranged = Partial<Record<'setsMin' | 'setsMax' | 'repsMin' | 'repsMax' | 'durationMin' | 'durationMax', number>>;

// min ≤ max kontrolü; güncellemede yalnızca iki değer de gönderildiyse burada bakılır (gerisi serviste)
function checkRanges(v: Ranged, ctx: z.RefinementCtx) {
  for (const k of ['sets', 'reps', 'duration'] as const) {
    const min = v[`${k}Min`];
    const max = v[`${k}Max`];
    if (min !== undefined && max !== undefined && min > max) {
      ctx.addIssue({ code: 'custom', path: [`${k}Max`], message: `${k}Max, ${k}Min değerinden küçük olamaz` });
    }
  }
}

export const createExerciseSchema = z
  .object({ ...exerciseFields, contraindications: exerciseFields.contraindications.default([]) })
  .superRefine(checkRanges);

export const updateExerciseSchema = z
  .object(exerciseFields)
  .partial()
  .superRefine(checkRanges)
  .refine((v) => Object.keys(v).length > 0, 'Güncellenecek en az bir alan gönderin');

export const adminExerciseQuerySchema = z.object({
  approved: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  region: z.enum(REGION_CODES).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'physio']),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type AdminExerciseQuery = z.infer<typeof adminExerciseQuerySchema>;

// Tarih filtresi: 'YYYY-MM-DD' gelirse gün başı / gün sonu (yerel saat) kabul edilir
const dateParam = (edge: 'start' | 'end') =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`) : new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Geçersiz tarih' });
        return z.NEVER;
      }
      return d;
    });

export const auditQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  userId: z.coerce.number().int().positive().optional(),
  email: z.string().trim().min(1).max(255).optional(),
  from: dateParam('start').optional(),
  to: dateParam('end').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;
