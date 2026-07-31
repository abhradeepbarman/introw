import type { InterviewSources } from '@repo/common/validations';
import { apiPost, apiRequest } from './api-client';

export type PreInterviewResponse = {
  id: string;
};

export type SessionResponse = {
  sdp: string;
};

export const startPreInterview = (sources: InterviewSources) =>
  apiPost<PreInterviewResponse>('/interview/pre', sources);

export const createSession = (interviewId: string, offerSdp: string) =>
  apiRequest<SessionResponse>(`/interview/${interviewId}/session`, {
    method: 'POST',
    body: offerSdp,
    headers: { 'Content-Type': 'application/sdp' },
  });
