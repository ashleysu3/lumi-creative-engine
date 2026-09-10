import { handleGenerateCreativeSet } from './http.js';
import { OpenAIModelProvider } from '../providers/openaiModelProvider.js';

type Env = {
  LUMI_ENGINE_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_REASONING_EFFORT?: 'none'|'low'|'medium'|'high'|'xhigh'|'max';
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,x-lumi-model-mode'
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null,{ status:204, headers:corsHeaders });
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({
      ok:true,
      service:'lumi-creative-engine',
      modelProviderConfigured:Boolean(env.OPENAI_API_KEY),
      model:env.OPENAI_API_KEY ? (env.OPENAI_MODEL ?? 'gpt-5.6-terra') : null
    },{ headers:corsHeaders });
    if (url.pathname !== '/v1/creative/generate' || request.method !== 'POST') return Response.json({ ok:false,error:'not_found' },{ status:404, headers:corsHeaders });

    if (env.LUMI_ENGINE_TOKEN) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${env.LUMI_ENGINE_TOKEN}`) return Response.json({ ok:false,error:'unauthorized' },{ status:401, headers:corsHeaders });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ ok:false,error:'invalid_json' },{ status:400, headers:corsHeaders }); }

    const modelMode = request.headers.get('x-lumi-model-mode') ?? 'auto';
    const modelProvider = env.OPENAI_API_KEY && modelMode !== 'deterministic'
      ? new OpenAIModelProvider({
          apiKey:env.OPENAI_API_KEY,
          model:env.OPENAI_MODEL ?? 'gpt-5.6-terra',
          reasoningEffort:env.OPENAI_REASONING_EFFORT ?? 'medium'
        })
      : undefined;

    const result = await handleGenerateCreativeSet(body, {
      modelProvider,
      refineRoutes:Boolean(modelProvider),
      refineBriefs:Boolean(modelProvider)
    });
    return new Response(result.body,{ status:result.status, headers:{ ...corsHeaders, ...(result.headers ?? {}) } });
  }
};
