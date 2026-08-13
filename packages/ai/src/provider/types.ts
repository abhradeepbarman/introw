export type GenerateParams<TModel extends string = string> = {
  model: TModel;
  systemInstruction: string;
  contents: string;
  responseSchema: Record<string, unknown>;
};

export interface AIProvider<TModel extends string = string> {
  generateContent(params: GenerateParams<TModel>): Promise<string | undefined>;
}
