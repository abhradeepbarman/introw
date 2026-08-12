import { z } from 'zod';

export const RESUME_MIME_TYPE = 'application/pdf';
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

const experienceSchema = z.object({
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  duration: z.string().trim().min(1).optional(),
  highlights: z.array(z.string().trim().min(1)).max(4),
});

const projectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  technologies: z.array(z.string().trim().min(1)).max(8),
});

export const resumeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  headline: z.string().trim().min(1).optional(),
  skills: z.array(z.string().trim().min(1)).max(20),
  experience: z.array(experienceSchema).max(6),
  projects: z.array(projectSchema).max(6),
  education: z.array(z.string().trim().min(1)).max(3),
});

export type Resume = z.infer<typeof resumeSchema>;
