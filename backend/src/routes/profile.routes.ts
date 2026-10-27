import { Router } from 'express';
import { getProfile, saveProfile } from '../controllers/profile.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', getProfile);
router.put('/', saveProfile);

export default router;
