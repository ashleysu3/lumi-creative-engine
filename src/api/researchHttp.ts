import { z } from 'zod';
import { researchWebsite } from '../studio/websiteResearch.js';
import type { HttpResponse } from './http.js';

export const WebsiteResearchRequestSchema = z.object({
  url:z.string().min(3),
  maxPages:z.number().int().min(1).max(15).optional(),
  extraUrls:z.array(z.string()).max(10).optional()
});

export async function handleWebsiteResearch(body:unknown):Promise<HttpResponse> {
  const parsed = WebsiteResearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {status:400,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'invalid_research_input',issues:parsed.error.issues})};
  }
  try {
    const data = await researchWebsite(parsed.data);
    const socialNotes = data.discoveredSocialLinks.map(url=>`Social profile discovered: ${url}`);
    data.profileDraft.sourceNotes = [...(data.profileDraft.sourceNotes ?? []),...socialNotes];
    return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true,data})};
  } catch (error) {
    return {status:422,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'website_research_failed',message:error instanceof Error?error.message:'Unknown error'})};
  }
}
