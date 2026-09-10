import { generateCreativeSet, type GenerateCreativeSetOptions } from '../index.js';
import { CreativeEngineInputSchema } from '../schemas/index.js';

export type HttpResponse = {
  status: number;
  headers?: Record<string,string>;
  body: string;
};

export async function handleGenerateCreativeSet(requestBody: unknown, options:GenerateCreativeSetOptions = {}): Promise<HttpResponse> {
  const parsed = CreativeEngineInputSchema.safeParse(requestBody);
  if (!parsed.success) {
    return {
      status: 400,
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ ok:false, error:'invalid_input', issues:parsed.error.issues })
    };
  }

  try {
    const output = await generateCreativeSet(parsed.data, options);
    return {
      status: 200,
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ ok:true, data:output })
    };
  } catch (error) {
    return {
      status: 500,
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ ok:false, error:'generation_failed', message:error instanceof Error ? error.message : 'Unknown error' })
    };
  }
}
