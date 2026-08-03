import { Router } from 'express';
import {
  createInterview,
  createSession,
  downloadTranscript,
  getInterviewResult,
} from '../controller/interview.controller';

const router = Router();

router.post('/', createInterview);
router.post('/:id/session', createSession);
router.post('/:id/result', getInterviewResult);
router.get('/:id/transcript', downloadTranscript);

export default router;
