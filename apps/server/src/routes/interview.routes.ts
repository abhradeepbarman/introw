import { Router } from 'express';
import { preInterviewHandler } from '../controller/interview.controller';

const router = Router();

router.post('/pre', preInterviewHandler);

export default router;
