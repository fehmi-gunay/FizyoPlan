import { Router } from 'express';
import { getExercise, listExercises } from '../controllers/exercises.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', listExercises);
router.get('/:id', getExercise);

export default router;
