import { z } from 'zod';

export const ModelTaskSchema = z.enum([
  'route-ideation',
  'creative-brief',
  'carousel-copy',
  'video-script',
  'website-research',
  'semantic-qa',
  'visual-qa'
]);

export type ModelTask = z.infer<typeof ModelTaskSchema>;

export type ModelRequest<TInput> = {
  task: ModelTask;
  input: TInput;
  system?: string;
  responseSchemaName?: string;
};

export type ModelProvider = {
  generate<TInput, TOutput>(request: ModelRequest<TInput>): Promise<TOutput>;
};

export class NoopModelProvider implements ModelProvider {
  async generate<TInput, TOutput>(_request: ModelRequest<TInput>): Promise<TOutput> {
    throw new Error('No model provider configured.');
  }
}
