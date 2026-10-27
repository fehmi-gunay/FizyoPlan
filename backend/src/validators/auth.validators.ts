import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Geçerli bir e-posta girin'));
const newPassword = z
  .string()
  .min(8, 'Parola en az 8 karakter olmalı')
  .max(72, 'Parola en fazla 72 karakter olabilir')
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Parola en az bir harf içermeli')
  .regex(/\d/, 'Parola en az bir rakam içermeli');

export const registerSchema = z.object({
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Parola gerekli').max(72),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut parola gerekli').max(72),
  newPassword,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Onay için parola gerekli').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
