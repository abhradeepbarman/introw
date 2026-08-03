import type { InterviewSources, Rubric } from '@repo/common/validations';
import { apiPost, apiRequest } from './api-client';

export type CreateInterviewResponse = {
  id: string;
};

export type SessionResponse = {
  sdp: string;
};

export type InterviewResult = {
  score: number;
  feedback: string;
  /** null for interviews scored before the rubric breakdown existed */
  rubric: Rubric | null;
};

export const createInterview = (sources: InterviewSources) =>
  apiPost<CreateInterviewResponse>('/interviews', sources);

export const createSession = (interviewId: string, offerSdp: string) =>
  apiRequest<SessionResponse>(`/interviews/${interviewId}/session`, {
    method: 'POST',
    body: offerSdp,
    headers: { 'Content-Type': 'application/sdp' },
  });

export const getInterviewResult = (interviewId: string) =>
  apiRequest<InterviewResult>(`/interviews/${interviewId}/result`, { method: 'POST' });
