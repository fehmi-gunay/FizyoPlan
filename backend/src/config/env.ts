import 'dotenv/config';
import { z } from 'zod';

// .env değerlerini başlangıçta doğrular; eksik/hatalı varsa uygulama açılmaz.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı'),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Geçersiz ortam değişkenleri (.env):');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
