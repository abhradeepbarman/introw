import { Router } from 'express';
import {
  createInterview,
  startSession,
  downloadReport,
  downloadTranscript,
  getInterviewResult,
  listInterviews,
} from '../controller/interview.controller';
import auth from '../middlewares/auth';
import { uploadResume } from '../middlewares/upload';

const router = Router();

router.post('/', auth, uploadResume, createInterview);
router.get('/', auth, listInterviews);
router.post('/:id/session', auth, startSession);
router.post('/:id/result', auth, getInterviewResult);
router.get('/:id/report', auth, downloadReport);
router.get('/:id/transcript', auth, downloadTranscript);

export default router;
