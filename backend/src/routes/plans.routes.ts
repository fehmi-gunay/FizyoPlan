import { Router } from 'express';
import { activatePlan, generatePlan, getPlan } from '../controllers/plans.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { generatePlanSchema } from '../validators/plan.validators';

const router = Router();

router.use(authenticate);
router.post('/generate', validate(generatePlanSchema), generatePlan);
router.get('/:id', getPlan);
router.post('/:id/activate', activatePlan);

export default router;
