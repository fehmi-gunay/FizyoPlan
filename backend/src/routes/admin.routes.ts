import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { createExerciseSchema, updateExerciseSchema, updateRoleSchema } from '../validators/admin.validators';

const router = Router();

router.use(authenticate);

// Egzersiz kütüphanesi: uzman (physio) ve admin
const staff = requireRole('admin', 'physio');
router.get('/exercises', staff, adminController.listExercises);
router.post('/exercises', staff, validate(createExerciseSchema), adminController.createExercise);
router.put('/exercises/:id', staff, validate(updateExerciseSchema), adminController.updateExercise);
router.post('/exercises/:id/approve', staff, adminController.approveExercise);
router.post('/exercises/:id/unapprove', staff, adminController.unapproveExercise);

// Kullanıcı yönetimi: yalnızca admin
const adminOnly = requireRole('admin');
router.get('/users', adminOnly, adminController.listUsers);
router.patch('/users/:id/role', adminOnly, validate(updateRoleSchema), adminController.updateUserRole);

export default router;
