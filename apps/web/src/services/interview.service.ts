import type { InterviewSources } from '@repo/common/validations';
import { apiPost } from './api-client';

export type PreInterviewResponse = {
  id: string;
};

export const startPreInterview = (sources: InterviewSources) =>
  apiPost<PreInterviewResponse>('/interview/pre', sources);
