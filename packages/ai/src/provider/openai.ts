import OpenAI from 'openai';
import type { ResponsesModel } from 'openai/resources/shared';
import type { AIProvider, GenerateParams } from './types';

export class OpenAIProvider implements AIProvider<ResponsesModel> {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateContent({
    model,
    systemInstruction,
    contents,
    responseSchema,
  }: GenerateParams<ResponsesModel>): Promise<string | undefined> {
    const response = await this.client.responses.create({
      model,
      input: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: contents },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'response',
          schema: responseSchema,
        },
      },
    });

    return response.output_text;
  }
}
