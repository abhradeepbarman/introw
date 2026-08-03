import type { InterviewSources, Rubric } from '@repo/common/validations';
import envConfig from '../config/env';
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
  rubric: Rubric | null;
  transcript: TranscriptLine[];
};

export type TranscriptLine = {
  speaker: 'CANDIDATE' | 'INTERVIEWER';
  message: string;
  at: string;
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

export const transcriptDownloadUrl = (interviewId: string) =>
  `${envConfig.API_BASE_URL}/interviews/${interviewId}/transcript`;
