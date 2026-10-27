import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';
import { ApiError } from './utils/ApiError';

// Varsayılan doğrulama mesajları Türkçe
z.config(z.locales.tr());

const app = express();

// Testlerde istek sınırı uygulanmaz
const limiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, _res, next) => next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Çok fazla istek, lütfen biraz sonra tekrar deneyin')),
  });

app.disable('x-powered-by');
if (env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(limiter(15 * 60 * 1000, 300));

app.get('/', (_req, res) => {
  res.json({ name: 'Fizyoterapi API', health: '/api/health', docs: 'backend/API.md' });
});

// Kaba kuvvet denemelerine karşı giriş/kayıt için daha sıkı sınır (geliştirmede gevşek)
const authLimit = env.NODE_ENV === 'production' ? 10 : 200;
app.use('/api/auth/login', limiter(15 * 60 * 1000, authLimit));
app.use('/api/auth/register', limiter(60 * 60 * 1000, authLimit));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
