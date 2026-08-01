import { Router } from 'express';
import interviewRoutes from './interview.routes';

const router = Router();

router.use('/interviews', interviewRoutes);

export default router;
