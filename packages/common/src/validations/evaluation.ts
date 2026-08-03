import { z } from 'zod';

const dimensionSchema = z.object({
  assessed: z.boolean(),
  summary: z.string().trim().min(1),
  evidence: z.array(z.string().trim().min(1)).max(3),
  strengths: z.array(z.string().trim().min(1)).max(3),
  improvements: z.array(z.string().trim().min(1)).max(3),
  score: z.number().int().min(0).max(100),
});

export type Dimension = z.infer<typeof dimensionSchema>;

export const rubricSchema = z.object({
  clarity: dimensionSchema,
  technicalCorrectness: dimensionSchema,
  structure: dimensionSchema,
  feedback: z.string().trim().min(1),
});

export type Rubric = z.infer<typeof rubricSchema>;

export type DimensionKey = Exclude<keyof Rubric, 'feedback'>;

export const DIMENSIONS: Record<DimensionKey, { label: string; blurb: string; weight: number }> = {
  technicalCorrectness: {
    label: 'Technical correctness',
    blurb: 'Accuracy and depth of the technical claims made',
    weight: 0.5,
  },
  clarity: {
    label: 'Clarity',
    blurb: 'How understandable the answers were to a listener',
    weight: 0.25,
  },
  structure: {
    label: 'Structure (STAR)',
    blurb: 'Situation, Task, Action, Result on behavioural answers',
    weight: 0.25,
  },
};

export const DIMENSION_KEYS = Object.keys(DIMENSIONS) as DimensionKey[];

export const compositeScore = (rubric: Rubric): number => {
  const assessed = DIMENSION_KEYS.filter((key) => rubric[key].assessed);
  const totalWeight = assessed.reduce((sum, key) => sum + DIMENSIONS[key].weight, 0);

  if (totalWeight === 0) return 0;

  const weighted = assessed.reduce(
    (sum, key) => sum + rubric[key].score * DIMENSIONS[key].weight,
    0,
  );

  return Math.round(weighted / totalWeight);
};
