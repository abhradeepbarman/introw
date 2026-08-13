import { AIService, INTERVIEW_EVALUATOR_SYSTEM_PROMPT } from '@repo/ai';
import {
  DIMENSION_KEYS,
  evaluationSchema,
  rubricSchema,
  type Evaluation,
  type Rubric,
} from '@repo/common/validations';
import { z } from 'zod';
import { UserType, type Message } from '@repo/db';
import { envConfig } from '../../config';
import { CustomErrorHandler } from '../../utils';

export type InterviewResult = {
  score: number;
  feedback: string;
  rubric: Rubric;
};

const ai = new AIService('gemini', envConfig.GEMINI_API_KEY);

const MAX_SCORE_DRIFT = 15;
const settleScore = (evaluation: Evaluation): number => {
  const scores = DIMENSION_KEYS.map((key) => evaluation[key]?.score).filter(
    (score): score is number => score !== undefined,
  );

  if (scores.length === 0) return evaluation.overall;

  const mean = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  return Math.abs(evaluation.overall - mean) > MAX_SCORE_DRIFT ? mean : evaluation.overall;
};

export const evaluateInterview = async (conversation: Message[]): Promise<InterviewResult> => {
  const transcript = conversation
    .map((m) => `${m.createdBy === UserType.CANDIDATE ? 'Candidate' : 'Interviewer'}: ${m.message}`)
    .join('\n');

  let text: string | undefined;
  try {
    text = await ai.generateContent({
      model: 'gemini-3.6-flash',
      systemInstruction: INTERVIEW_EVALUATOR_SYSTEM_PROMPT,
      contents: transcript,
      responseSchema: z.toJSONSchema(evaluationSchema, { reused: 'inline' }),
    });
  } catch {
    throw CustomErrorHandler.serverError('Could not evaluate the interview');
  }

  if (!text) {
    throw CustomErrorHandler.serverError('Could not evaluate the interview');
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw CustomErrorHandler.serverError('Could not evaluate the interview');
  }

  const parsed = evaluationSchema.safeParse(json);
  if (!parsed.success) {
    throw CustomErrorHandler.serverError('Could not evaluate the interview');
  }

  return {
    score: settleScore(parsed.data),
    feedback: parsed.data.feedback,
    rubric: rubricSchema.parse(parsed.data),
  };
};
