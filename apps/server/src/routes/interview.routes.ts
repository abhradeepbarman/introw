import { Router } from 'express';
import {
  createInterview,
  createSession,
  downloadReport,
  downloadTranscript,
  getInterviewResult,
  listInterviews,
} from '../controller/interview.controller';
import auth from '../middlewares/authenticate';

const router = Router();

router.post('/', auth, createInterview);
router.get('/', auth, listInterviews);
router.post('/:id/session', auth, createSession);
router.post('/:id/result', auth, getInterviewResult);
router.get('/:id/report', auth, downloadReport);
router.get('/:id/transcript', auth, downloadTranscript);

export default router;
