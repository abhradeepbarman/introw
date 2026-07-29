import { z } from 'zod';

const LINKEDIN_PROFILE = /^https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/[\w%-]{2,100}\/?$/i;
const GITHUB_PROFILE = /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?$/i;

export const linkedinUrlSchema = z
  .string()
  .trim()
  .min(1, 'Add your LinkedIn profile URL.')
  .regex(LINKEDIN_PROFILE, 'Use a profile link like https://linkedin.com/in/your-handle');

export const githubUrlSchema = z
  .string()
  .trim()
  .min(1, 'Add your GitHub profile URL.')
  .regex(GITHUB_PROFILE, 'Use a profile link like https://github.com/your-handle');

export const interviewSourcesSchema = z.object({
  linkedinUrl: linkedinUrlSchema,
  githubUrl: githubUrlSchema,
});

export type InterviewSources = z.infer<typeof interviewSourcesSchema>;
