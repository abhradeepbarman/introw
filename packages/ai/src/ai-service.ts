import { createProvider, type AIProviderName, type ProviderModel } from './model-router';
import type { GenerateParams } from './provider/types';

export class AIService<TName extends AIProviderName = AIProviderName> {
  private readonly provider;

  constructor(providerName: TName, apiKey: string) {
    this.provider = createProvider(providerName, apiKey);
  }

  generateContent(params: GenerateParams<ProviderModel<TName>>): Promise<string | undefined> {
    return this.provider.generateContent(params);
  }
}
