import { z } from 'zod';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { CreativeEngineInput, CreativeEngineOutput } from '../schemas/index.js';
import type { CampaignBrief, ClientCreativeProfile } from './profileSchemas.js';
import { AgencyDeliveryPackSchema, type AgencyDeliveryPack } from './deliverables.js';

const TalkingHeadRefinementSchema = z.object({
  creativeId:z.string(),
  hook:z.string().min(3),
  fullScript:z.string().min(40),
  alternateHooks:z.array(z.string()).max(6).default([]),
  deliveryNotes:z.array(z.string()).max(8).default([]),
  brollInsertIdeas:z.array(z.string()).max(10).default([]),
  onScreenText:z.array(z.string()).max(10).default([]),
  cta:z.string().optional()
});

const BrollRefinementSchema = z.object({
  creativeId:z.string(),
  hook:z.string().min(3),
  voiceover:z.string().min(20),
  durationSeconds:z.number().min(8).max(90),
  selectedSegmentIds:z.array(z.string()).default([]),
  shotSequence:z.array(z.object({
    start:z.number().min(0),
    end:z.number().min(0),
    purpose:z.string().min(2),
    visual:z.string().min(3),
    onScreenText:z.string().optional(),
    voiceover:z.string().optional()
  })).min(2).max(14),
  editNotes:z.array(z.string()).max(10).default([]),
  cta:z.string().optional()
});

const AgencyVideoRefinementSchema = z.object({
  talkingHeadScripts:z.array(TalkingHeadRefinementSchema).default([]),
  brollAds:z.array(BrollRefinementSchema).default([]),
  otherVideoPlans:z.array(BrollRefinementSchema).default([])
});

function compactContext(profile:ClientCreativeProfile,campaign:CampaignBrief,input:CreativeEngineInput,output:CreativeEngineOutput,pack:AgencyDeliveryPack) {
  return {
    client:{
      name:profile.clientName,
      industry:profile.industry,
      businessSummary:profile.businessSummary,
      brandVoice:profile.brandVoice,
      creativeLearning:profile.creativeLearning,
      globalConstraints:profile.globalConstraints
    },
    campaign:{
      name:campaign.name,
      objective:campaign.objective,
      audienceTemperature:campaign.audienceTemperature,
      promotion:campaign.promotion,
      keyMessage:campaign.keyMessage,
      campaignNotes:campaign.campaignNotes,
      creativeDirectionNotes:campaign.creativeDirectionNotes
    },
    offer:input.offer,
    audience:input.audience,
    approvedMedia:input.mediaAssets.map(asset=>({
      id:asset.id,type:asset.type,tags:asset.tags,founderPresent:asset.founderPresent,faceVisible:asset.faceVisible,orientation:asset.orientation,segments:asset.segments
    })),
    concepts:output.concepts.map(concept=>({
      creativeId:concept.route.id,
      format:concept.route.format,
      conceptName:concept.route.conceptName,
      singleBigIdea:concept.route.singleBigIdea,
      primaryHook:concept.route.primaryHook,
      visualSummary:concept.route.visualSummary,
      headline:concept.brief.headline,
      supportingCopy:concept.brief.supportingCopy,
      cta:concept.brief.cta,
      mediaMatch:concept.mediaMatch
    })),
    draftDeliverables:{
      talkingHeadScripts:pack.talkingHeadScripts,
      brollAds:pack.brollAds,
      otherVideoPlans:pack.otherVideoPlans
    }
  };
}

function mergeById<T extends {creativeId:string}>(original:T[],refined:T[]):T[] {
  const byId=new Map(refined.map(item=>[item.creativeId,item]));
  return original.map(item=>byId.get(item.creativeId) ?? item);
}

/**
 * Turns video-plan scaffolding into actual agency-ready scripts. The deterministic
 * pack is useful for plumbing, but should never be the final client handoff.
 */
export async function refineAgencyDeliverablesWithModel(
  profile:ClientCreativeProfile,
  campaign:CampaignBrief,
  input:CreativeEngineInput,
  output:CreativeEngineOutput,
  pack:AgencyDeliveryPack,
  provider:ModelProvider
):Promise<AgencyDeliveryPack> {
  const hasVideo=pack.talkingHeadScripts.length+pack.brollAds.length+pack.otherVideoPlans.length>0;
  if (!hasVideo) return pack;

  const raw=await provider.generate<ReturnType<typeof compactContext>,unknown>({
    task:'video-script',
    input:compactContext(profile,campaign,input,output,pack),
    system:`You are the senior direct-response video creative strategist at After Organic. Rewrite the supplied draft video deliverables into client-ready Meta ad production scripts.

These are for a paying agency client, not an AI demo. The deterministic drafts are scaffolding only. Do not preserve weak phrasing just because it appears in the draft.

Global rules:
- Use only the supplied client, offer, audience, campaign, proof, and media context. Never invent results, testimonials, prices, credentials, guarantees, customer counts, offer features, deadlines, or claims.
- The script must be unmistakably about THIS offer and THIS buyer. Reject generic lines that could fit an unrelated brand.
- Preserve the strategic concept and creativeId, but rewrite weak hooks and language completely when needed.
- Use the client's documented voice, phrases, customer language, campaign direction, and creative learnings where relevant.
- Do not say internal labels such as desired outcome, current approach, better way, objection angle, mechanism shift, campaign priority, creative route, or archetype.
- Avoid AI filler such as game-changing, unlock, elevate, transform your business, level up, more useful path, and “if that sounds like what you need.”
- Hooks should create an immediate reason to keep watching without becoming clickbait.
- CTAs should fit the actual offer and objective. Do not default to “learn more” when a more specific supplied next step is clear.

Talking-head requirements:
- Write a complete, natural spoken script, not a stack of headline fragments.
- Aim for roughly 25–55 seconds unless the concept clearly needs less.
- Structure the thought conversationally: hook → specific tension/insight → useful explanation or proof/mechanism → natural next step.
- The founder should sound like a smart human talking to one ideal buyer, not reading ad copy from a teleprompter.
- Provide 3–5 genuinely different alternate hooks when possible.
- Delivery notes must be concrete: pace, emphasis, framing, gesture, prop/screen insert, pause, or tone.
- B-roll insert ideas should support a specific sentence or beat, not generic “show laptop” filler.
- On-screen text should be short enough to read on a phone.

B-roll requirements:
- Write the full voiceover as one coherent spoken script.
- Build a timed shot sequence whose visuals actively illustrate or contrast the voiceover.
- Use supplied video segment IDs when a segment genuinely matches; otherwise describe the exact shot the client should capture.
- Do not force founder footage into product/demo concepts or product footage into emotional founder concepts.
- Keep text overlays concise and complementary; do not subtitle every spoken sentence as giant design copy.
- Edit notes should tell an editor how to pace the ad, where to pattern-interrupt, and what should remain visually continuous.

Return JSON only with talkingHeadScripts, brollAds, and otherVideoPlans. Return exactly the supplied creativeIds for each corresponding category.`
  });

  const refined=AgencyVideoRefinementSchema.parse(raw);
  return AgencyDeliveryPackSchema.parse({
    ...pack,
    talkingHeadScripts:mergeById(pack.talkingHeadScripts,refined.talkingHeadScripts.map(item=>{
      const original=pack.talkingHeadScripts.find(x=>x.creativeId===item.creativeId);
      return original ? {...original,...item} : item as never;
    }).filter((item):item is AgencyDeliveryPack['talkingHeadScripts'][number]=>pack.talkingHeadScripts.some(x=>x.creativeId===item.creativeId))),
    brollAds:mergeById(pack.brollAds,refined.brollAds.map(item=>{
      const original=pack.brollAds.find(x=>x.creativeId===item.creativeId);
      return original ? {...original,...item} : item as never;
    }).filter((item):item is AgencyDeliveryPack['brollAds'][number]=>pack.brollAds.some(x=>x.creativeId===item.creativeId))),
    otherVideoPlans:mergeById(pack.otherVideoPlans,refined.otherVideoPlans.map(item=>{
      const original=pack.otherVideoPlans.find(x=>x.creativeId===item.creativeId);
      return original ? {...original,...item} : item as never;
    }).filter((item):item is AgencyDeliveryPack['otherVideoPlans'][number]=>pack.otherVideoPlans.some(x=>x.creativeId===item.creativeId)))
  });
}
