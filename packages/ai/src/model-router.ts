import type { ResponsesModel } from 'openai/resources/shared';
import { GeminiProvider } from './provider/gemini';
import { OpenAIProvider } from './provider/openai';
import type { AIProvider } from './provider/types';

export type AIProviderName = 'gemini' | 'openai';

export type ProviderModel<TName extends AIProviderName> = TName extends 'openai'
  ? ResponsesModel
  : string;

export const createProvider = <TName extends AIProviderName>(
  name: TName,
  apiKey: string
): AIProvider<ProviderModel<TName>> => {
  const provider = name === 'openai' ? new OpenAIProvider(apiKey) : new GeminiProvider(apiKey);
  return provider as AIProvider<ProviderModel<TName>>;
};
