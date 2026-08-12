import { z } from 'zod';

export const GITHUB_PROFILE = /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?$/i;

export const interviewSourcesSchema = z.object({
  githubUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || GITHUB_PROFILE.test(value), {
      message: 'Use a profile link like https://github.com/your-handle',
    })
    .optional(),
});

export type InterviewSources = z.infer<typeof interviewSourcesSchema>;
