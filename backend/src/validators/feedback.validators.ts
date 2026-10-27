import { z } from 'zod';

// Egzersiz sonrası bildirim: a = ağrı (0-10), z = zorluk (1-10)
export const feedbackSchema = z.object({
  pain: z.number().int().min(0).max(10),
  difficulty: z.number().int().min(1).max(10),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
