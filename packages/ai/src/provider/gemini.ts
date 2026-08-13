import { GoogleGenAI } from '@google/genai';
import type { AIProvider, GenerateParams } from './types';

export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateContent({
    model,
    systemInstruction,
    contents,
    responseSchema,
  }: GenerateParams): Promise<string | undefined> {
    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    return response.text;
  }
}
