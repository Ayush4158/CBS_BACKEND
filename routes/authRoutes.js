import express from 'express';
import { 
    register, 
    login, 
    forgotPassword, 
    resetPassword 
} from '../controllers/authController.js';
import { authenticateToken, restrictTo, validate } from '../middlewares/authMiddleware.js';
import { 
    registerSchema, 
    loginSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema 
} from '../validators/formSchemas.js';

const router = express.Router();

router.post('/register', authenticateToken, restrictTo('admin'), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;