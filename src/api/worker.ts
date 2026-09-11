import { handleGenerateCreativeSet } from './http.js';
import { handleRenderCreative } from './renderHttp.js';
import { handleAgencyStudioGenerate } from './studioHttp.js';
import { handleWebsiteResearch } from './researchHttp.js';
import { creativeLabHtml } from './labHtml.js';
import { agencyStudioHtml } from './studioHtml.js';
import { websiteResearchHtml } from './researchHtml.js';
import { OpenAIModelProvider } from '../providers/openaiModelProvider.js';
import { OpenAIImageProvider, type OpenAIImageQuality } from '../providers/openaiImageProvider.js';
import { SvgCompositionProvider } from '../rendering/svgCompositionProvider.js';

type Env = {
  LUMI_ENGINE_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_REASONING_EFFORT?: 'none'|'low'|'medium'|'high'|'xhigh'|'max';
  OPENAI_IMAGE_MODEL?: string;
  OPENAI_IMAGE_QUALITY?: OpenAIImageQuality;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,x-lumi-model-mode'
};

function jsonResult(result:{status:number;headers?:Record<string,string>;body:string}) {
  return new Response(result.body,{ status:result.status,headers:{...corsHeaders,...(result.headers??{})} });
}

function modelProviderFor(request:Request,env:Env) {
  const modelMode = request.headers.get('x-lumi-model-mode') ?? 'auto';
  return env.OPENAI_API_KEY && modelMode !== 'deterministic'
    ? new OpenAIModelProvider({
        apiKey:env.OPENAI_API_KEY,
        model:env.OPENAI_MODEL ?? 'gpt-5.6-terra',
        reasoningEffort:env.OPENAI_REASONING_EFFORT ?? 'medium'
      })
    : undefined;
}

function diagnosticsHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>After Organic Diagnostics</title><style>body{font-family:system-ui;background:#f4f1ec;color:#1d1b19;margin:0;padding:28px}.wrap{max-width:760px;margin:auto}.card{background:#fff;border:1px solid #ddd6cd;border-radius:16px;padding:18px;margin:12px 0}h1{font-family:Georgia,serif}button,a{display:inline-block;border:0;border-radius:10px;padding:10px 14px;background:#1d1b19;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.muted{color:#716c65}.good{color:#25633f}.bad{color:#982c2c}pre{white-space:pre-wrap;word-break:break-word;background:#f6f3ef;padding:12px;border-radius:10px}</style></head><body><div class="wrap"><h1>After Organic AI Diagnostics</h1><p class="muted">This page checks whether the Codespace loaded the local API key and whether a real model request succeeds. It never displays the key.</p><div class="card"><b>1. Local configuration</b><pre id="health">Checking…</pre></div><div class="card"><b>2. Live OpenAI request</b><p class="muted">This sends one tiny JSON request using the same provider the Studio uses.</p><button id="test">Test AI connection</button><pre id="result">Not tested yet.</pre></div><a href="/studio">Back to Studio</a></div><script>const health=document.getElementById('health'),result=document.getElementById('result'),btn=document.getElementById('test');fetch('/health').then(r=>r.json()).then(j=>{health.textContent=JSON.stringify({engine:j.ok,agencyGenerationReady:j.agencyGenerationReady,model:j.model,imageModel:j.imageModel},null,2);health.className=j.agencyGenerationReady?'good':'bad'}).catch(e=>{health.textContent=e.message;health.className='bad'});btn.onclick=async()=>{btn.disabled=true;result.textContent='Testing…';result.className='';try{const r=await fetch('/v1/studio/test-ai',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});const j=await r.json();result.textContent=JSON.stringify(j,null,2);result.className=r.ok?'good':'bad'}catch(e){result.textContent=e.message;result.className='bad'}finally{btn.disabled=false}};</script></body></html>`;
}

function studioPageHtml(modelConfigured:boolean) {
  const readinessBanner = modelConfigured
    ? '<div style="margin:0 0 14px;padding:11px 14px;border-radius:12px;background:#edf8f0;border:1px solid #b9ddc3;color:#215b36;font-size:12px"><b>Agency AI is on.</b> Client research and creative generation will use model-assisted strategy. <a href="/diagnostics" style="color:inherit;font-weight:800">Run diagnostics</a></div>'
    : '<div style="margin:0 0 14px;padding:11px 14px;border-radius:12px;background:#fff0ed;border:1px solid #efc5bc;color:#843529;font-size:12px"><b>Agency AI is off.</b> Client deliverable generation is disabled. Add the local OpenAI configuration, then <a href="/diagnostics" style="color:inherit;font-weight:800">run diagnostics</a>.</div>';
  return agencyStudioHtml
    .replace('<div class="layout">',`${readinessBanner}<div class="layout">`)
    .replace('<option value="deterministic">Deterministic only</option>','')
    .replace('AI refinement when configured','Agency AI')
    .replace("j.ok?'Engine online · '+(j.modelProviderConfigured?'AI available':'deterministic'):'Engine unavailable'","j.ok?(j.agencyGenerationReady?'Engine online · agency AI ready':'Engine online · AI setup required'):'Engine unavailable'")
    .replace('<button id="sampleProfile" class="ghost">Load sample</button>','<button id="sampleProfile" class="ghost">Load sample</button><button class="secondary" onclick="location.href=\'/research\'">Research website</button>')
    .replace('const $=id=>document.getElementById(id);let sessionMedia=[];let studioResult=null;','const $=id=>document.getElementById(id);let sessionMedia=[];let studioResult=null;let loadedSourceNotes=[];let loadedSourceLinks=[];')
    .replace('mediaAssets:[],sourceNotes:[],updatedAt:new Date().toISOString()','mediaAssets:[],sourceLinks:loadedSourceLinks,sourceNotes:loadedSourceNotes,updatedAt:new Date().toISOString()')
    .replace('sourceNotes:[],updatedAt:new Date().toISOString()','sourceLinks:loadedSourceLinks,sourceNotes:loadedSourceNotes,updatedAt:new Date().toISOString()')
    .replace('function populateProfile(p){','function populateProfile(p){loadedSourceNotes=p.sourceNotes||[];loadedSourceLinks=p.sourceLinks||[];')
    .replace('sample();health();',`(()=>{const id=localStorage.getItem('after-organic-last-profile');const raw=id&&localStorage.getItem('after-organic-profile:'+id);if(raw){try{populateProfile(JSON.parse(raw));$('profileStatus').className='status good';$('profileStatus').textContent='Loaded saved client profile.'}catch{sample()}}else{sample()}health()})();`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null,{ status:204, headers:corsHeaders });
    const url = new URL(request.url);

    if ((url.pathname === '/' || url.pathname === '/studio') && request.method === 'GET') {
      return new Response(studioPageHtml(Boolean(env.OPENAI_API_KEY)),{ headers:{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' } });
    }

    if (url.pathname === '/diagnostics' && request.method === 'GET') {
      return new Response(diagnosticsHtml(),{ headers:{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' } });
    }

    if ((url.pathname === '/research' || url.pathname === '/studio/research') && request.method === 'GET') {
      return new Response(websiteResearchHtml,{ headers:{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' } });
    }

    if (url.pathname === '/lab' && request.method === 'GET') {
      return new Response(creativeLabHtml,{ headers:{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' } });
    }

    if (url.pathname === '/health') return Response.json({
      ok:true,
      service:'lumi-creative-engine',
      mode:'agency-studio',
      modelProviderConfigured:Boolean(env.OPENAI_API_KEY),
      agencyGenerationReady:Boolean(env.OPENAI_API_KEY),
      model:env.OPENAI_API_KEY ? (env.OPENAI_MODEL ?? 'gpt-5.6-terra') : null,
      imageProviderConfigured:Boolean(env.OPENAI_API_KEY),
      imageModel:env.OPENAI_API_KEY ? (env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2') : null,
      compositionProvider:'svg',
      studioAvailable:true,
      websiteResearchAvailable:true,
      labAvailable:true
    },{ headers:corsHeaders });

    if (url.pathname === '/v1/studio/test-ai' && request.method === 'POST') {
      const provider=modelProviderFor(request,env);
      if (!provider) return Response.json({ok:false,error:'ai_not_configured',message:'OPENAI_API_KEY was not loaded by Wrangler. Check the local .dev.vars file and restart npm run dev.'},{status:503,headers:corsHeaders});
      try {
        const result=await provider.generate<{probe:boolean},{ok:boolean;message?:string}>({
          task:'website-research',
          input:{probe:true},
          system:'This is a connectivity probe. Return JSON only: {"ok":true,"message":"AI connection works"}.'
        });
        return Response.json({ok:true,model:env.OPENAI_MODEL ?? 'gpt-5.6-terra',result},{headers:corsHeaders});
      } catch(error) {
        return Response.json({ok:false,error:'ai_connection_failed',model:env.OPENAI_MODEL ?? 'gpt-5.6-terra',message:error instanceof Error?error.message:'Unknown AI connection error'},{status:502,headers:corsHeaders});
      }
    }

    if (request.method !== 'POST' || !['/v1/creative/generate','/v1/creative/render','/v1/studio/generate','/v1/studio/research-website'].includes(url.pathname)) {
      return Response.json({ ok:false,error:'not_found' },{ status:404, headers:corsHeaders });
    }

    if (env.LUMI_ENGINE_TOKEN) {
      const auth = request.headers.get('authorization');
      if (auth !== `Bearer ${env.LUMI_ENGINE_TOKEN}`) return Response.json({ ok:false,error:'unauthorized' },{ status:401, headers:corsHeaders });
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ ok:false,error:'invalid_json' },{ status:400, headers:corsHeaders }); }

    if (url.pathname === '/v1/studio/research-website') {
      return jsonResult(await handleWebsiteResearch(body,{ modelProvider:modelProviderFor(request,env) }));
    }

    if (url.pathname === '/v1/creative/render') {
      const imageProvider = env.OPENAI_API_KEY ? new OpenAIImageProvider({
        apiKey:env.OPENAI_API_KEY,
        model:env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2',
        quality:env.OPENAI_IMAGE_QUALITY ?? 'high'
      }) : undefined;
      return jsonResult(await handleRenderCreative(body,{
        sceneProvider:imageProvider,
        compositionProvider:new SvgCompositionProvider()
      }));
    }

    const modelProvider = modelProviderFor(request,env);

    if (url.pathname === '/v1/studio/generate') {
      return jsonResult(await handleAgencyStudioGenerate(body,{ modelProvider,requireModelProvider:true }));
    }

    return jsonResult(await handleGenerateCreativeSet(body, {
      modelProvider,
      refineRoutes:Boolean(modelProvider),
      refineBriefs:Boolean(modelProvider)
    }));
  }
};
