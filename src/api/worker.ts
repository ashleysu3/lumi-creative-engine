import { handleGenerateCreativeSet } from './http.js';

type Env = {
  LUMI_ENGINE_TOKEN?: string;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type'
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null,{ status:204, headers:corsHeaders });
    const url = new URL(request.url);
    if (url.pathname === '/health') return Response.json({ ok:true, service:'lumi-creative-engine' },{ headers:corsHeaders });
    if (url.pathname !== '/v1/creative/generate' || request.method !== 'POST') return Response.json({ ok:false,error:'not_found' },{ status:404, headers:corsHeaders });

    if (env.LUMI_ENGINE_TOKEN) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${env.LUMI_ENGINE_TOKEN}`) return Response.json({ ok:false,error:'unauthorized' },{ status:401, headers:corsHeaders });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ ok:false,error:'invalid_json' },{ status:400, headers:corsHeaders }); }

    const result = await handleGenerateCreativeSet(body);
    return new Response(result.body,{ status:result.status, headers:{ ...corsHeaders, ...(result.headers ?? {}) } });
  }
};
