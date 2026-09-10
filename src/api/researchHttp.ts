import { z } from 'zod';
import { researchWebsite } from '../studio/websiteResearch.js';
import { refineWebsiteResearchWithModel } from '../studio/refineWebsiteResearch.js';
import type { ClientSourceLink } from '../studio/profileSchemas.js';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { HttpResponse } from './http.js';

export const WebsiteResearchRequestSchema = z.object({
  url:z.string().min(3),
  maxPages:z.number().int().min(1).max(15).optional(),
  extraUrls:z.array(z.string()).max(10).optional()
});

export type WebsiteResearchHttpOptions = { modelProvider?:ModelProvider };

function normalizeUrl(value:string) {
  try { return new URL(value.startsWith('http') ? value : `https://${value}`).toString(); }
  catch { return ''; }
}

function sourceType(url:string):ClientSourceLink['type'] {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('pinterest.com')) return 'pinterest';
    if (host.includes('threads.net')) return 'threads';
  } catch {}
  return 'other';
}

function unique(values:string[]) { return [...new Set(values.filter(Boolean))]; }

export async function handleWebsiteResearch(body:unknown,options:WebsiteResearchHttpOptions={}):Promise<HttpResponse> {
  const parsed = WebsiteResearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {status:400,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'invalid_research_input',issues:parsed.error.issues})};
  }
  try {
    const root = normalizeUrl(parsed.data.url);
    const rootOrigin = root ? new URL(root).origin : '';
    const provided = (parsed.data.extraUrls ?? []).map(normalizeUrl).filter(Boolean);
    const providedSocial = provided.filter(url=>sourceType(url)!=='other');
    const sameSiteExtras = provided.filter(url=>{
      try { return new URL(url).origin===rootOrigin; } catch { return false; }
    });

    let data = await researchWebsite({...parsed.data,url:root || parsed.data.url,extraUrls:sameSiteExtras});
    const socialLinks = unique([...data.discoveredSocialLinks,...providedSocial]);
    data.discoveredSocialLinks = socialLinks;
    const socialNotes = socialLinks.map(url=>`Social profile discovered/provided: ${url}`);
    data.profileDraft.sourceNotes = [...(data.profileDraft.sourceNotes ?? []),...socialNotes];
    data.profileDraft.sourceLinks = [
      {type:'website',url:data.rootUrl,status:'analyzed',notes:`Crawled ${data.pages.length} public page${data.pages.length===1?'':'s'}.`},
      ...sameSiteExtras.filter(url=>url!==data.rootUrl).map(url=>({type:'sales-page' as const,url,status:'analyzed' as const,notes:'Provided as an additional same-site research source.'})),
      ...socialLinks.map(url=>({type:sourceType(url),url,status:'needs-connection' as const,notes:'Social source recorded. Connect or import this source for deeper content analysis.'}))
    ];

    if (options.modelProvider) {
      try { data = await refineWebsiteResearchWithModel(data,options.modelProvider); }
      catch (error) { data.warnings.push(`AI synthesis unavailable; deterministic research draft used. ${error instanceof Error?error.message:''}`.trim()); }
    }

    return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true,data,semanticSynthesis:Boolean(options.modelProvider)})};
  } catch (error) {
    return {status:422,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'website_research_failed',message:error instanceof Error?error.message:'Unknown error'})};
  }
}
