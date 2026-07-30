import { Router } from 'express';
import interviewRoutes from './interview.routes';

const router = Router();

router.use('/interview', interviewRoutes);

export default router;
