import { GoogleGenAI } from '@google/genai';
import {
  DIMENSION_KEYS,
  evaluationSchema,
  rubricSchema,
  settleScore,
  type Evaluation,
  type Rubric,
} from '@repo/common/validations';
import { z } from 'zod';
import type { Message } from '../../generated/prisma/client';
import envConfig from '../config/env';
import CustomErrorHandler from './custom-error-handler';

const GEMINI_MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = `You are a senior engineer grading a technical interview transcript.

Score each dimension you can judge from 0 to 100 using these anchors:
- 85-100: exceptional, would clear the bar at a strong engineering org
- 70-84: strong, minor gaps
- 55-69: adequate, meets expectations with visible weaknesses
- 35-54: weak, significant gaps
- 0-34: poor or essentially absent

The dimensions:

1. TECHNICAL CORRECTNESS — are the candidate's technical claims accurate, and how deep do they go? Reward precise reasoning about trade-offs, failure modes and their own design decisions. Penalise vague hand-waving, and penalise confidently wrong statements harder than admitted uncertainty.

2. CLARITY — could a listener follow the answers? Reward direct answers to the question asked, concrete language and well-chosen detail. Penalise rambling, jargon used as a substitute for explanation, and answers that never land on a point.

3. STRUCTURE — on behavioural questions ("tell me about a time...", "how did you handle..."), did the answer cover Situation, Task, Action and Result? Result is the element candidates skip most often — check for it specifically. Judge this dimension ONLY on behavioural answers, never on purely technical ones.

Rules:
- OMIT any dimension the transcript gives you no basis to judge — most importantly, omit "structure" when no behavioural question was asked. Omitting is not a penalty; leave the field out entirely rather than inventing a score.
- "overall" is your own judgement of the interview as a whole on the same 0-100 scale. Weigh technical correctness heaviest, then decide — do not average the dimensions mechanically, but do not stray far from them either.
- "evidence" is at most two short quotes copied VERBATIM from the candidate's lines. Never quote the interviewer, never paraphrase, never invent. If you cannot find a real quote, leave the array empty.
- "summary" is one or two sentences on why that dimension scored the way it did.
- "strengths" and "improvements" cover the whole interview, not one dimension: up to three short phrases each. Every improvement must be actionable — say what to do differently, not just what was wrong.
- "feedback" is 3-5 sentences addressed to the candidate as "you": what they did well first, then what to improve. Reference the transcript specifically.
- If the transcript is too short to judge, omit every dimension, score "overall" low and say in the feedback that the interview ended too early to assess.
- Judge only what was said. Do not reward or penalise anything you had to assume.`;

export type InterviewResult = {
  score: number;
  feedback: string;
  rubric: Rubric;
};

const ai = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_KEY });

const failed = (reason: string, detail?: unknown) => {
  console.error(`❌ Evaluation failed — ${reason}:`, detail);
  return CustomErrorHandler.serverError('Could not evaluate the interview');
};

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Drop any quote the candidate did not actually say — the one check we do not delegate. */
const groundEvidence = (evaluation: Evaluation, candidateSaid: string): Evaluation => {
  const haystack = normalise(candidateSaid);
  const grounded = { ...evaluation };

  for (const key of DIMENSION_KEYS) {
    const dimension = grounded[key];
    if (!dimension) continue;

    grounded[key] = {
      ...dimension,
      evidence: dimension.evidence.filter((quote) => {
        const needle = normalise(quote);
        if (needle && haystack.includes(needle)) return true;
        console.warn('⚠️ Dropped ungrounded evidence quote:', quote);
        return false;
      }),
    };
  }

  return grounded;
};

export const evaluateInterview = async (conversation: Message[]): Promise<InterviewResult> => {
  const transcript = conversation
    .map((m) => `${m.createdBy === 'CANDIDATE' ? 'Candidate' : 'Interviewer'}: ${m.message}`)
    .join('\n');

  const candidateSaid = conversation
    .filter((m) => m.createdBy === 'CANDIDATE')
    .map((m) => m.message)
    .join('\n');

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: transcript,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: z.toJSONSchema(evaluationSchema, { reused: 'inline' }),
      },
    });
    text = response.text;
  } catch (cause) {
    throw failed('request rejected', cause);
  }

  if (!text) {
    throw failed('model returned no text');
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw failed('answer was not valid JSON', text);
  }

  const parsed = evaluationSchema.safeParse(json);
  if (!parsed.success) {
    throw failed('answer did not match schema', parsed.error.issues);
  }

  const evaluation = groundEvidence(parsed.data, candidateSaid);

  return {
    score: settleScore(evaluation),
    feedback: evaluation.feedback,
    // rubricSchema strips "overall" and "feedback" — those are stored as their own columns.
    rubric: rubricSchema.parse(evaluation),
  };
};
