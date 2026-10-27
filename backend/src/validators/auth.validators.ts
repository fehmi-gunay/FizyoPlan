import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Geçerli bir e-posta girin')),
  password: z.string().min(8, 'Parola en az 8 karakter olmalı').max(72, 'Parola en fazla 72 karakter olabilir'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Geçerli bir e-posta girin')),
  password: z.string().min(1, 'Parola gerekli'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
