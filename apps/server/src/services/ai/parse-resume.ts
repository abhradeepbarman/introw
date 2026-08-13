import { AIService, RESUME_PARSER_SYSTEM_PROMPT } from '@repo/ai';
import { resumeSchema, type Resume } from '@repo/common/validations';
import { z } from 'zod';
import { envConfig } from '../../config';
import { CustomErrorHandler } from '../../utils';
import { extractTextFromPDF } from '..';

const MAX_RESUME_CHARS = 20_000;
const ai = new AIService('gemini', envConfig.GEMINI_API_KEY);

export const parseResume = async (pdf: Buffer): Promise<Resume> => {
  const text = await extractTextFromPDF(pdf);

  if (!text) {
    throw CustomErrorHandler.badRequest(
      'No text found in this PDF — scanned or image-only résumés cannot be read',
    );
  }

  let answer: string | undefined;
  try {
    answer = await ai.generateContent({
      model: 'gemini-3.6-flash',
      systemInstruction: RESUME_PARSER_SYSTEM_PROMPT,
      contents: text.slice(0, MAX_RESUME_CHARS),
      responseSchema: z.toJSONSchema(resumeSchema, { reused: 'inline' }),
    });
  } catch {
    throw CustomErrorHandler.serverError('Could not read the résumé');
  }

  if (!answer) {
    throw CustomErrorHandler.serverError('Could not read the résumé');
  }

  let json: unknown;
  try {
    json = JSON.parse(answer);
  } catch {
    throw CustomErrorHandler.serverError('Could not read the résumé');
  }

  const parsed = resumeSchema.safeParse(json);
  if (!parsed.success) {
    throw CustomErrorHandler.serverError('Could not read the résumé');
  }

  return parsed.data;
};
