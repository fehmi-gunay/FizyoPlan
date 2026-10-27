import { Router } from 'express';
import { sequelize } from '../config/database';

const router = Router();

// GET /api/health -> sunucu ve veritabanı ayakta mı?
router.get('/', async (_req, res) => {
  let db: 'up' | 'down' = 'up';
  try {
    await sequelize.authenticate();
  } catch {
    db = 'down';
  }
  res.status(db === 'up' ? 200 : 503).json({
    status: db === 'up' ? 'ok' : 'degraded',
    db,
    time: new Date().toISOString(),
  });
});

export default router;
