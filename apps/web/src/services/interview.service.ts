import {
  DEFAULT_PAGE_SIZE,
  type InterviewSources,
  type Paginated,
  type Rubric,
} from '@repo/common/validations';
import axiosInstance from '../lib/axios';
import type { ApiResponse } from '@/lib/api-error';
import { downloadFile } from '@/utils/download-file';

export type CreateInterviewResponse = {
  id: string;
};

export type InterviewSessionResponse = {
  sdp: string;
};

export type InterviewResult = {
  score: number;
  feedback: string;
  rubric: Rubric | null;
  transcript: TranscriptLine[];
};

export enum UserType {
  CANDIDATE = 'CANDIDATE',
  INTERVIEWER = 'INTERVIEWER',
}

export type TranscriptLine = {
  speaker: UserType;
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
  messageCount: number;
};

export const createInterview = (sources: InterviewSources, resume?: File | null) => {
  const body = new FormData();
  if (sources.githubUrl) body.set('githubUrl', sources.githubUrl);
  if (resume) body.set('resume', resume);

  return axiosInstance
    .post<ApiResponse<CreateInterviewResponse>>('/interviews', body, {
      headers: { 'Content-Type': undefined },
    })
    .then((res) => res.data.data);
};

export const createInterviewSession = (interviewId: string, offerSdp: string) =>
  axiosInstance
    .post<ApiResponse<InterviewSessionResponse>>(`/interviews/${interviewId}/session`, offerSdp, {
      headers: { 'Content-Type': 'application/sdp' },
    })
    .then((res) => res.data.data);

export const getInterview = (interviewId: string) =>
  axiosInstance
    .get<ApiResponse<{ id: string; status: InterviewStatus }>>(`/interviews/${interviewId}`)
    .then((res) => res.data.data);

export const completeInterview = (interviewId: string) =>
  axiosInstance
    .post<ApiResponse<{ status: InterviewStatus }>>(`/interviews/${interviewId}/complete`)
    .then((res) => res.data.data);

export const getInterviewResult = (interviewId: string) =>
  axiosInstance
    .post<ApiResponse<InterviewResult>>(`/interviews/${interviewId}/result`)
    .then((res) => res.data.data);

export const listInterviews = (page: number, limit: number = DEFAULT_PAGE_SIZE) =>
  axiosInstance
    .get<ApiResponse<Paginated<InterviewSummary>>>(`/interviews?page=${page}&limit=${limit}`)
    .then((res) => res.data.data);

export const downloadReport = (interviewId: string) =>
  downloadFile(`/interviews/${interviewId}/report`, `introw-report-${interviewId}.pdf`);

export const downloadTranscript = (interviewId: string) =>
  downloadFile(`/interviews/${interviewId}/transcript`, `introw-transcript-${interviewId}.txt`);
