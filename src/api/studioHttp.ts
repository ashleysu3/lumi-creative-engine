import { z } from 'zod';
import { MediaAssetSchema } from '../schemas/index.js';
import { generateCreativeSet } from '../index.js';
import { buildCreativeEngineInput } from '../studio/engineAdapter.js';
import { AgencyDeliveryPackSchema, buildAgencyDeliveryPack } from '../studio/deliverables.js';
import { CampaignBriefSchema, ClientCreativeProfileSchema } from '../studio/profileSchemas.js';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { HttpResponse } from './http.js';

export const AgencyStudioRequestSchema = z.object({
  profile:ClientCreativeProfileSchema,
  campaign:CampaignBriefSchema,
  sessionMedia:z.array(MediaAssetSchema).default([])
});

export type AgencyStudioHttpOptions = { modelProvider?:ModelProvider };

export async function handleAgencyStudioGenerate(body:unknown,options:AgencyStudioHttpOptions={}):Promise<HttpResponse> {
  const parsed = AgencyStudioRequestSchema.safeParse(body);
  if (!parsed.success) return {
    status:400,
    headers:{'content-type':'application/json'},
    body:JSON.stringify({ok:false,error:'invalid_agency_studio_input',issues:parsed.error.issues})
  };

  try {
    const input = buildCreativeEngineInput(parsed.data.profile,parsed.data.campaign,parsed.data.sessionMedia);
    const output = await generateCreativeSet(input,{
      modelProvider:options.modelProvider,
      refineRoutes:Boolean(options.modelProvider),
      refineBriefs:Boolean(options.modelProvider),
      modelBatching:true
    });
    const deliverables = AgencyDeliveryPackSchema.parse(buildAgencyDeliveryPack(output));
    return {
      status:200,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ok:true,data:{input,output,deliverables}})
    };
  } catch (error) {
    return {
      status:500,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ok:false,error:'agency_studio_generation_failed',message:error instanceof Error?error.message:'Unknown error'})
    };
  }
}
