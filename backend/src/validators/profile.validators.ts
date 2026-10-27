import { z } from 'zod';
import { clinicalConfig } from '../config/clinical';
import { ageFrom } from '../utils/age';

const MIN_AGE = clinicalConfig.minAge;
export const REGION_CODES = ['neck', 'shoulder', 'lower_back', 'knee'] as const;

export const profileSchema = z.object({
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate YYYY-AA-GG formatında olmalı')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Geçersiz tarih')
    .refine((v) => ageFrom(v) >= MIN_AGE, `Sistem ${MIN_AGE} yaş ve üzeri içindir`),
  heightCm: z.number().int().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active']),
  redFlags: z.array(z.string().trim().min(1).max(100)).default([]),
  conditions: z.array(z.string().trim().min(1).max(100)).default([]),
  painRegions: z
    .array(
      z.object({
        regionCode: z.enum(REGION_CODES),
        severity: z.number().int().min(0).max(10),
      }),
    )
    .default([]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const exerciseQuerySchema = z.object({
  region: z.enum(REGION_CODES).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});
