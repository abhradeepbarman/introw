import {
  DEFAULT_PAGE_SIZE,
  type InterviewSources,
  type Paginated,
  type Rubric,
} from '@repo/common/validations';
import { apiGet, apiPost, apiRequest, downloadFile } from './api-client';

export type CreateInterviewResponse = {
  id: string;
};

export type InterviewSessionResponse = {
  sdp: string;
  remainingTime: number;
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

export type InterviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type InterviewSummary = {
  id: string;
  createdAt: string;
  status: InterviewStatus;
  score: number;
  hasReport: boolean;
  repos: string[];
  messageCount: number;
};

export const createInterview = (sources: InterviewSources) =>
  apiPost<CreateInterviewResponse>('/interviews', sources);

export const createInterviewSession = (interviewId: string, offerSdp: string) =>
  apiRequest<InterviewSessionResponse>(`/interviews/${interviewId}/session`, {
    method: 'POST',
    body: offerSdp,
    headers: { 'Content-Type': 'application/sdp' },
  });

export const getInterviewResult = (interviewId: string) =>
  apiRequest<InterviewResult>(`/interviews/${interviewId}/result`, { method: 'POST' });

export const listInterviews = (page: number, limit: number = DEFAULT_PAGE_SIZE) =>
  apiGet<Paginated<InterviewSummary>>(`/interviews?page=${page}&limit=${limit}`);

export const downloadReport = (interviewId: string) =>
  downloadFile(`/interviews/${interviewId}/report`, `intervue-report-${interviewId}.pdf`);

export const downloadTranscript = (interviewId: string) =>
  downloadFile(`/interviews/${interviewId}/transcript`, `intervue-transcript-${interviewId}.txt`);
