import { z } from 'zod';
import { MediaAssetSchema } from '../schemas/index.js';
import { generateCreativeSet } from '../index.js';
import { buildCreativeEngineInput } from '../studio/engineAdapter.js';
import { AgencyDeliveryPackSchema, buildAgencyDeliveryPack } from '../studio/deliverables.js';
import { refineAgencyDeliverablesWithModel } from '../studio/refineDeliverables.js';
import { CampaignBriefSchema, ClientCreativeProfileSchema, type ClientCreativeProfile } from '../studio/profileSchemas.js';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { HttpResponse } from './http.js';

export const AgencyStudioRequestSchema = z.object({
  profile:ClientCreativeProfileSchema,
  campaign:CampaignBriefSchema,
  sessionMedia:z.array(MediaAssetSchema).default([])
});

export type AgencyStudioHttpOptions = {
  modelProvider?:ModelProvider;
  /** Internal agency output must not silently fall back to deterministic template copy. */
  requireModelProvider?:boolean;
};

function websiteDraftNeedsSynthesis(profile:ClientCreativeProfile) {
  const fromWebsiteResearch = profile.sourceNotes.some(note=>/website research draft generated|research cleanup applied/i.test(note));
  const synthesized = profile.sourceNotes.some(note=>/semantic website synthesis completed/i.test(note));
  return fromWebsiteResearch && !synthesized;
}

function profileQualityIssues(profile:ClientCreativeProfile) {
  const offer=profile.offers[0];
  const audience=profile.audiences[0];
  const issues:string[]=[];
  if (!profile.businessSummary || profile.businessSummary.length<20) issues.push('business summary');
  if (!offer || !offer.summary || offer.summary.length<20) issues.push('offer summary');
  if (!audience || !audience.description || /requires (?:agency )?review|needs agency review/i.test(audience.description)) issues.push('audience definition');
  return issues;
}

export async function handleAgencyStudioGenerate(body:unknown,options:AgencyStudioHttpOptions={}):Promise<HttpResponse> {
  const parsed = AgencyStudioRequestSchema.safeParse(body);
  if (!parsed.success) return {
    status:400,
    headers:{'content-type':'application/json'},
    body:JSON.stringify({ok:false,error:'invalid_agency_studio_input',issues:parsed.error.issues})
  };

  const requireModelProvider = options.requireModelProvider !== false;
  if (requireModelProvider && !options.modelProvider) {
    return {
      status:503,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:false,
        error:'ai_required_for_agency_generation',
        message:'Agency creative generation is disabled because no AI model provider is configured. Deterministic mode is for engine tests only and is not allowed to produce client deliverables.'
      })
    };
  }

  if (websiteDraftNeedsSynthesis(parsed.data.profile)) {
    return {
      status:422,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:false,
        error:'client_profile_needs_semantic_research',
        message:'This client profile came from a source-only website crawl. Re-run Client Research with AI synthesis enabled before generating agency creative, or manually complete and save the client profile.'
      })
    };
  }

  const qualityIssues=profileQualityIssues(parsed.data.profile);
  if (qualityIssues.length) {
    return {
      status:422,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:false,
        error:'client_profile_too_thin',
        message:`The client brain is missing reliable ${qualityIssues.join(', ')}. Improve the client research/profile before generating creative.`,
        issues:qualityIssues
      })
    };
  }

  try {
    const input = buildCreativeEngineInput(parsed.data.profile,parsed.data.campaign,parsed.data.sessionMedia);
    const output = await generateCreativeSet(input,{
      modelProvider:options.modelProvider,
      refineRoutes:Boolean(options.modelProvider),
      refineBriefs:Boolean(options.modelProvider),
      modelBatching:true
    });
    let deliverables = AgencyDeliveryPackSchema.parse(buildAgencyDeliveryPack(output));
    if (options.modelProvider) {
      deliverables = await refineAgencyDeliverablesWithModel(
        parsed.data.profile,
        parsed.data.campaign,
        input,
        output,
        deliverables,
        options.modelProvider
      );
    }
    return {
      status:200,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:true,
        data:{input,output,deliverables},
        generationMode:options.modelProvider?'ai-synthesized':'deterministic-test-only'
      })
    };
  } catch (error) {
    return {
      status:500,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ok:false,error:'agency_studio_generation_failed',message:error instanceof Error?error.message:'Unknown error'})
    };
  }
}
