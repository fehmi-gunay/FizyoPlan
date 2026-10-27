import { Router } from 'express';
import authRoutes from './auth.routes';
import exercisesRoutes from './exercises.routes';
import healthRoutes from './health.routes';
import profileRoutes from './profile.routes';
import regionsRoutes from './regions.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/regions', regionsRoutes);
router.use('/exercises', exercisesRoutes);
// Sonraki aşamalarda: /plans, /plan-items ...

export default router;
