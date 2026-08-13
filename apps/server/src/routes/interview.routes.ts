import { Router } from 'express';
import {
  createInterview,
  startSession,
  downloadReport,
  downloadTranscript,
  getInterviewResult,
  listInterviews,
} from '../controller';
import { auth, uploadResume } from '../middlewares';

const router = Router();

router.post('/', auth, uploadResume, createInterview);
router.get('/', auth, listInterviews);
router.post('/:id/session', auth, startSession);
router.post('/:id/result', auth, getInterviewResult);
router.get('/:id/report', auth, downloadReport);
router.get('/:id/transcript', auth, downloadTranscript);

export default router;
