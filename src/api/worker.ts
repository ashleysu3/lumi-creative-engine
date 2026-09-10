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

function studioPageHtml() {
  return agencyStudioHtml
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
      return new Response(studioPageHtml(),{ headers:{ 'content-type':'text/html; charset=utf-8','cache-control':'no-store' } });
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
      model:env.OPENAI_API_KEY ? (env.OPENAI_MODEL ?? 'gpt-5.6-terra') : null,
      imageProviderConfigured:Boolean(env.OPENAI_API_KEY),
      imageModel:env.OPENAI_API_KEY ? (env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare') : null,
      compositionProvider:'svg',
      studioAvailable:true,
      websiteResearchAvailable:true,
      labAvailable:true
    },{ headers:corsHeaders });

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
        model:env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare',
        quality:env.OPENAI_IMAGE_QUALITY ?? 'high'
      }) : undefined;
      return jsonResult(await handleRenderCreative(body,{
        sceneProvider:imageProvider,
        compositionProvider:new SvgCompositionProvider()
      }));
    }

    const modelProvider = modelProviderFor(request,env);

    if (url.pathname === '/v1/studio/generate') {
      return jsonResult(await handleAgencyStudioGenerate(body,{ modelProvider }));
    }

    return jsonResult(await handleGenerateCreativeSet(body, {
      modelProvider,
      refineRoutes:Boolean(modelProvider),
      refineBriefs:Boolean(modelProvider)
    }));
  }
};
