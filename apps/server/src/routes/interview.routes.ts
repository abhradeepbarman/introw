import { Router } from 'express';
import { createInterview, createSession, createSttGrant } from '../controller/interview.controller';

const router = Router();

router.post('/', createInterview);
router.post('/:id/session', createSession);
router.post('/:id/stt-grant', createSttGrant);

export default router;
