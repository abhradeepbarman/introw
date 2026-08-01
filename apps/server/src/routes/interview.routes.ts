import { Router } from 'express';
import { createInterview, createSession } from '../controller/interview.controller';

const router = Router();

router.post('/', createInterview);
router.post('/:id/session', createSession);

export default router;
