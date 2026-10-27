import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import exercisesRoutes from './exercises.routes';
import healthRoutes from './health.routes';
import planItemsRoutes from './planItems.routes';
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
router.use('/plan-items', planItemsRoutes);
router.use('/admin', adminRoutes);

export default router;
