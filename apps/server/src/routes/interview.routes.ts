import { Router } from 'express';
import {
  createInterview,
  createSession,
  downloadReport,
  downloadTranscript,
  getInterviewResult,
  listInterviews,
} from '../controller/interview.controller';
import authenticate from '../middlewares/authenticate';

const router = Router();

router.post('/', authenticate, createInterview);
router.get('/', authenticate, listInterviews);
router.post('/:id/session', authenticate, createSession);
router.post('/:id/result', authenticate, getInterviewResult);
router.get('/:id/report', authenticate, downloadReport);
router.get('/:id/transcript', authenticate, downloadTranscript);

export default router;
