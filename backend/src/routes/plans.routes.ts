import { Router } from 'express';
import {
  activatePlan,
  generatePlan,
  getActivePlan,
  getPlan,
  getToday,
  listPlans,
  reassessPlan,
} from '../controllers/plans.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { generatePlanSchema } from '../validators/plan.validators';

const router = Router();

router.use(authenticate);
router.get('/', listPlans);
router.post('/generate', validate(generatePlanSchema), generatePlan);
// /active uçları /:id'den önce tanımlanmalı
router.get('/active', getActivePlan);
router.get('/active/today', getToday);
router.get('/:id', getPlan);
router.post('/:id/activate', activatePlan);
router.post('/:id/reassess', reassessPlan);

export default router;
