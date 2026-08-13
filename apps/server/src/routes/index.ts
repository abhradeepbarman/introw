import { Router } from 'express';
import authRoutes from './auth.routes';
import interviewRoutes from './interview.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/interviews', interviewRoutes);

export default router;
