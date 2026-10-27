import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { changePasswordSchema, deleteAccountSchema, loginSchema, registerSchema } from '../validators/auth.validators';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);
router.put('/password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.delete('/me', authenticate, validate(deleteAccountSchema), authController.deleteAccount);

export default router;
