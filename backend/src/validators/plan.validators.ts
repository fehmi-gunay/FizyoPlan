import { z } from 'zod';

export const generatePlanSchema = z.object({
  type: z.enum(['daily', 'weekly']).default('weekly'),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const listPlansQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'suspended', 'completed']).optional(),
  type: z.enum(['daily', 'weekly']).optional(),
});

export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;

export const todayQuerySchema = z.object({
  day: z.coerce.number().int().min(1).max(7).optional(),
});

// Öneri üreticinin (AI / kural tabanlı) JSON çıktısı için şema kontrolü (PDF Şekil 1, adım 5).
export function suggestionSchema(days: number) {
  return z.object({
    items: z
      .array(
        z.object({
          exerciseId: z.number().int().positive(),
          day: z.number().int().min(1).max(days),
          sets: z.number().int().positive(),
          reps: z.number().int().positive(),
          durationSec: z.number().int().positive(),
        }),
      )
      .max(days * 20),
  });
}

export type Suggestion = z.infer<ReturnType<typeof suggestionSchema>>;
export type SuggestedItem = Suggestion['items'][number];
