import { Router } from 'express';
import { listRegions } from '../controllers/regions.controller';

const router = Router();

router.get('/', listRegions);

export default router;
