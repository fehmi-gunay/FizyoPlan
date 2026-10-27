import { Router } from 'express';
import authRoutes from './auth.routes';
import exercisesRoutes from './exercises.routes';
import healthRoutes from './health.routes';
import plansRoutes from './plans.routes';
import profileRoutes from './profile.routes';
import regionsRoutes from './regions.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/regions', regionsRoutes);
router.use('/exercises', exercisesRoutes);
router.use('/plans', plansRoutes);
// Sonraki aşamalarda: /plan-items ...

export default router;
