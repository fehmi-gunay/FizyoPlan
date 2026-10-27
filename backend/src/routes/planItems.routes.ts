import { Router } from 'express';
import { submitFeedback } from '../controllers/planItems.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { feedbackSchema } from '../validators/feedback.validators';

const router = Router();

router.use(authenticate);
router.post('/:id/feedback', validate(feedbackSchema), submitFeedback);

export default router;
