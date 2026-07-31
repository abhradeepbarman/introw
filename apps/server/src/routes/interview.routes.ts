import { Router } from 'express';
import { preInterviewHandler, sessionHandler } from '../controller/interview.controller';

const router = Router();

router.post('/pre', preInterviewHandler);
router.post('/:id/session', sessionHandler);

export default router;
