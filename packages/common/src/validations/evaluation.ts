import { z } from 'zod';

const dimensionSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1),
  evidence: z.array(z.string().trim().min(1)).max(2),
});

export type Dimension = z.infer<typeof dimensionSchema>;

export const rubricSchema = z.object({
  technicalCorrectness: dimensionSchema.optional(),
  clarity: dimensionSchema.optional(),
  structure: dimensionSchema.optional(),
  strengths: z.array(z.string().trim().min(1)).max(3),
  improvements: z.array(z.string().trim().min(1)).max(3),
});

export type Rubric = z.infer<typeof rubricSchema>;

export const evaluationSchema = rubricSchema.extend({
  overall: z.number().int().min(0).max(100),
  feedback: z.string().trim().min(1),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export type DimensionKey = 'technicalCorrectness' | 'clarity' | 'structure';

export const DIMENSIONS: Record<DimensionKey, { label: string; blurb: string }> = {
  technicalCorrectness: {
    label: 'Technical correctness',
    blurb: 'Accuracy and depth of the technical claims made',
  },
  clarity: {
    label: 'Clarity',
    blurb: 'How understandable the answers were to a listener',
  },
  structure: {
    label: 'Structure (STAR)',
    blurb: 'Situation, Task, Action, Result on behavioural answers',
  },
};

export const DIMENSION_KEYS = Object.keys(DIMENSIONS) as DimensionKey[];

const MAX_SCORE_DRIFT = 15;
export const settleScore = (evaluation: Evaluation): number => {
  const scores = DIMENSION_KEYS.map((key) => evaluation[key]?.score).filter(
    (score): score is number => score !== undefined,
  );

  if (scores.length === 0) return evaluation.overall;

  const mean = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  return Math.abs(evaluation.overall - mean) > MAX_SCORE_DRIFT ? mean : evaluation.overall;
};
