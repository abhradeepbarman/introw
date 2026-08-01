import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Message } from '../../generated/prisma/client';
import envConfig from '../config/env';
import CustomErrorHandler from './custom-error-handler';

const GEMINI_MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = `You are a senior engineer grading a technical interview transcript.

Score the candidate from 0 to 100 on technical depth, clarity and ownership of the work they discussed.
Write feedback of 3-5 sentences addressed to the candidate: what they did well, then what to improve.
Be specific and reference the transcript. Do not invent anything that was not said.
If the transcript is too short to judge, score low and say the interview ended too early to assess.`;

const evaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().min(1),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

const ai = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_KEY });

const failed = (reason: string, detail?: unknown) => {
  console.error(`❌ Evaluation failed — ${reason}:`, detail);
  return CustomErrorHandler.serverError('Could not evaluate the interview');
};

export const evaluateInterview = async (conversation: Message[]): Promise<Evaluation> => {
  const transcript = conversation
    .map((m) => `${m.createdBy === 'CANDIDATE' ? 'Candidate' : 'Interviewer'}: ${m.message}`)
    .join('\n');

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: transcript,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        // same schema the answer is validated against, so the two can't drift
        responseSchema: z.toJSONSchema(evaluationSchema),
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

  const evaluation = evaluationSchema.safeParse(json);
  if (!evaluation.success) {
    throw failed('answer did not match schema', evaluation.error.issues);
  }

  return evaluation.data;
};
