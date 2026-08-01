import { Router } from 'express';
import {
  createInterview,
  createSession,
  getInterviewResult,
} from '../controller/interview.controller';

const router = Router();

router.post('/', createInterview);
router.post('/:id/session', createSession);
router.post('/:id/result', getInterviewResult);

export default router;
