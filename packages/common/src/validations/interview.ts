import { z } from 'zod';

const GITHUB_PROFILE = /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?$/i;

export const githubUrlSchema = z
  .string()
  .trim()
  .min(1, 'Add your GitHub profile URL.')
  .regex(GITHUB_PROFILE, 'Use a profile link like https://github.com/your-handle');

export const interviewSourcesSchema = z.object({
  githubUrl: githubUrlSchema,
});

export type InterviewSources = z.infer<typeof interviewSourcesSchema>;
