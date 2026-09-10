import type { ModelProvider, ModelRequest, ModelTask } from './modelProvider.js';
import { getOpenAIResponseSchema } from './openaiResponseSchemas.js';

type ReasoningEffort = 'none'|'low'|'medium'|'high'|'xhigh'|'max';

type OpenAIModelProviderOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  reasoningEffort?: ReasoningEffort;
  maxOutputTokens?: number;
};

type OpenAIResponse = {
  error?: { message?: string } | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function reasoningForTask(task: ModelTask, fallback: ReasoningEffort): ReasoningEffort {
  if (task === 'route-ideation') return fallback === 'none' ? 'medium' : fallback;
  if (task === 'creative-brief') return fallback === 'none' ? 'low' : fallback;
  if (task === 'semantic-qa' || task === 'visual-qa') return 'low';
  return fallback;
}

function extractOutputText(response: OpenAIResponse): string {
  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('').trim();
}

export class OpenAIModelProvider implements ModelProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly reasoningEffort: ReasoningEffort;
  private readonly maxOutputTokens: number;

  constructor(options: OpenAIModelProviderOptions) {
    if (!options.apiKey) throw new Error('OpenAIModelProvider requires an API key.');
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'gpt-5.6-terra';
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
    this.reasoningEffort = options.reasoningEffort ?? 'medium';
    this.maxOutputTokens = options.maxOutputTokens ?? 3500;
  }

  async generate<TInput, TOutput>(request: ModelRequest<TInput>): Promise<TOutput> {
    const responseSchema = getOpenAIResponseSchema(request.responseSchemaName);
    const format = responseSchema ? {
      type: 'json_schema',
      name: request.responseSchemaName ?? 'LumiCreativeOutput',
      strict: true,
      schema: responseSchema
    } : { type: 'json_object' };

    const payload = {
      model: this.model,
      instructions: request.system ?? 'You are the creative intelligence layer for Ads by Lumi. Return only the requested structured output.',
      input: JSON.stringify({ task: request.task, context: request.input }),
      reasoning: { effort: reasoningForTask(request.task, this.reasoningEffort) },
      text: { format, verbosity: 'low' },
      max_output_tokens: this.maxOutputTokens,
      store: false
    };

    const response = await this.fetchFn(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json() as OpenAIResponse;
    if (!response.ok) {
      throw new Error(body.error?.message ?? `OpenAI request failed with status ${response.status}.`);
    }

    const outputText = extractOutputText(body);
    if (!outputText) throw new Error('OpenAI returned no output text.');

    try {
      return JSON.parse(outputText) as TOutput;
    } catch {
      throw new Error('OpenAI returned output that could not be parsed as JSON.');
    }
  }
}

export type { OpenAIModelProviderOptions };
