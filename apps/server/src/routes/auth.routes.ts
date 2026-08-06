import { Router } from 'express';
import {
  getCurrentUser,
  googleCallback,
  googleLogin,
  refreshAccessToken,
  resetPassword,
  sendForgotPasswordEmail,
  userLogin,
  userLogout,
  userRegister,
} from '../controller/auth.controller';
import auth from '../middlewares/authenticate';

const router = Router();

router.post('/register', userRegister);
router.post('/login', userLogin);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', sendForgotPasswordEmail);
router.post('/reset-password/:token', resetPassword);

router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

router.get('/me', auth, getCurrentUser);
router.post('/logout', auth, userLogout);

export default router;
