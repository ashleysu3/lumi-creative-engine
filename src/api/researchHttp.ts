import { z } from 'zod';
import { researchWebsite } from '../studio/websiteResearch.js';
import type { ClientSourceLink } from '../studio/profileSchemas.js';
import type { HttpResponse } from './http.js';

export const WebsiteResearchRequestSchema = z.object({
  url:z.string().min(3),
  maxPages:z.number().int().min(1).max(15).optional(),
  extraUrls:z.array(z.string()).max(10).optional()
});

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

export async function handleWebsiteResearch(body:unknown):Promise<HttpResponse> {
  const parsed = WebsiteResearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {status:400,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'invalid_research_input',issues:parsed.error.issues})};
  }
  try {
    const data = await researchWebsite(parsed.data);
    const socialNotes = data.discoveredSocialLinks.map(url=>`Social profile discovered: ${url}`);
    data.profileDraft.sourceNotes = [...(data.profileDraft.sourceNotes ?? []),...socialNotes];
    data.profileDraft.sourceLinks = [
      {type:'website',url:data.rootUrl,status:'analyzed',notes:`Crawled ${data.pages.length} public page${data.pages.length===1?'':'s'}.`},
      ...data.discoveredSocialLinks.map(url=>({type:sourceType(url),url,status:'needs-connection' as const,notes:'Discovered from the public website. Connect or import this source for deeper content analysis.'}))
    ];
    return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true,data})};
  } catch (error) {
    return {status:422,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'website_research_failed',message:error instanceof Error?error.message:'Unknown error'})};
  }
}
