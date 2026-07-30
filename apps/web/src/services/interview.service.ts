import type { InterviewSources } from '@repo/common/validations';
import { apiPost } from './api-client';

export type PreInterviewResponse = {
  data: unknown;
};

export const startPreInterview = (sources: InterviewSources) =>
  apiPost<PreInterviewResponse>('/interview/pre', sources);
