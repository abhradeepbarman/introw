import { Router } from 'express';
import authRoutes from './auth.routes';
import billingRoutes from './billing.routes';
import interviewRoutes from './interview.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/interviews', interviewRoutes);

export default router;
