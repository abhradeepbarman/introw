import { GoogleGenAI } from '@google/genai';
import { resumeSchema, type Resume } from '@repo/common/validations';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import envConfig from '../config/env';
import CustomErrorHandler from './custom-error-handler';

const GEMINI_MODEL = 'gemini-3.6-flash';

const MAX_RESUME_CHARS = 20_000;

const SYSTEM_PROMPT = `You extract structured data from a candidate's résumé so an interviewer can question them on it.

Rules:
- Copy what the résumé says. Never infer, embellish or invent an employer, project, skill or date.
- "headline" is the candidate's current title or the one-line summary at the top, if there is one.
- "skills" are the technologies and tools named, at most 20, most prominent first.
- "experience" is paid roles, most recent first, at most 6. "highlights" are up to 4 short phrases per role, taken from the bullet points — prefer ones that state what the candidate built or decided.
- "projects" are personal or side projects, at most 6, separate from paid roles.
- "education" is at most 3 short lines, each like "BSc Computer Science, MIT, 2021".
- Omit "name" or "headline" entirely if the résumé does not state them. Use an empty array for any section the résumé does not have.`;

const ai = new GoogleGenAI({ apiKey: envConfig.GEMINI_API_KEY });

const failed = (reason: string, detail?: unknown) => {
  console.error(`❌ Résumé parsing failed — ${reason}:`, detail);
  return CustomErrorHandler.serverError('Could not read the résumé');
};

const extractText = async (pdf: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: pdf });

  try {
    const { text } = await parser.getText({ pageJoiner: '' });
    return text.trim();
  } catch (cause) {
    throw failed('PDF could not be read', cause);
  } finally {
    await parser.destroy();
  }
};

export const parseResume = async (pdf: Buffer): Promise<Resume> => {
  const text = await extractText(pdf);

  if (!text) {
    throw CustomErrorHandler.badRequest(
      'No text found in this PDF — scanned or image-only résumés cannot be read',
    );
  }

  let answer: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: text.slice(0, MAX_RESUME_CHARS),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: z.toJSONSchema(resumeSchema, { reused: 'inline' }),
      },
    });
    answer = response.text;
  } catch (cause) {
    throw failed('request rejected', cause);
  }

  if (!answer) {
    throw failed('model returned no text');
  }

  let json: unknown;
  try {
    json = JSON.parse(answer);
  } catch {
    throw failed('answer was not valid JSON', answer);
  }

  const parsed = resumeSchema.safeParse(json);
  if (!parsed.success) {
    throw failed('answer did not match schema', parsed.error.issues);
  }

  return parsed.data;
};
