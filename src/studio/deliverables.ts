import { z } from 'zod';
import type { CreativeEngineOutput } from '../schemas/index.js';

export const TalkingHeadScriptSchema = z.object({
  creativeId:z.string(),
  conceptName:z.string(),
  angle:z.string(),
  hook:z.string(),
  fullScript:z.string(),
  alternateHooks:z.array(z.string()).default([]),
  deliveryNotes:z.array(z.string()).default([]),
  brollInsertIdeas:z.array(z.string()).default([]),
  onScreenText:z.array(z.string()).default([]),
  cta:z.string().optional()
});

export const BrollAdPlanSchema = z.object({
  creativeId:z.string(),
  conceptName:z.string(),
  angle:z.string(),
  hook:z.string(),
  voiceover:z.string(),
  durationSeconds:z.number(),
  selectedSegmentIds:z.array(z.string()).default([]),
  shotSequence:z.array(z.object({
    start:z.number(),end:z.number(),purpose:z.string(),visual:z.string(),onScreenText:z.string().optional(),voiceover:z.string().optional()
  })),
  editNotes:z.array(z.string()).default([]),
  cta:z.string().optional()
});

export const StaticAdDeliverableSchema = z.object({
  creativeId:z.string(),conceptName:z.string(),angle:z.string(),headline:z.string(),supportingCopy:z.string().optional(),cta:z.string().optional(),qaScore:z.number(),mediaSource:z.string(),renderPlan:z.unknown()
});

export const CarouselDeliverableSchema = z.object({
  creativeId:z.string(),conceptName:z.string(),angle:z.string(),qaScore:z.number(),slides:z.array(z.object({slideNumber:z.number(),headline:z.string(),subhead:z.string().optional(),body:z.string().optional(),cta:z.string().optional()})),renderPlan:z.unknown()
});

export const AgencyDeliveryPackSchema = z.object({
  staticAds:z.array(StaticAdDeliverableSchema),
  brollAds:z.array(BrollAdPlanSchema),
  talkingHeadScripts:z.array(TalkingHeadScriptSchema),
  carousels:z.array(CarouselDeliverableSchema),
  otherVideoPlans:z.array(BrollAdPlanSchema),
  warnings:z.array(z.string()).default([])
});

function scriptBody(headline:string,supportingCopy:string|undefined,singleBigIdea:string,cta:string|undefined) {
  const parts = [headline,supportingCopy,singleBigIdea,cta ? `If that sounds like what you need, ${cta.toLowerCase()}.` : undefined]
    .map(part=>part?.trim()).filter((part):part is string=>Boolean(part));
  return [...new Set(parts)].join('\n\n');
}

export function buildAgencyDeliveryPack(output:CreativeEngineOutput):z.infer<typeof AgencyDeliveryPackSchema> {
  const staticAds:Array<z.infer<typeof StaticAdDeliverableSchema>> = [];
  const brollAds:Array<z.infer<typeof BrollAdPlanSchema>> = [];
  const talkingHeadScripts:Array<z.infer<typeof TalkingHeadScriptSchema>> = [];
  const carousels:Array<z.infer<typeof CarouselDeliverableSchema>> = [];
  const otherVideoPlans:Array<z.infer<typeof BrollAdPlanSchema>> = [];

  for (const concept of output.concepts) {
    const { route,brief,mediaMatch,qa,renderPlan } = concept;
    const base = { creativeId:route.id,conceptName:route.conceptName,angle:route.angleId };

    if (renderPlan.kind === 'static') {
      staticAds.push({...base,headline:brief.headline,supportingCopy:brief.supportingCopy,cta:brief.cta,qaScore:qa.qualityScore,mediaSource:mediaMatch.source,renderPlan});
      continue;
    }

    if (renderPlan.kind === 'carousel') {
      carousels.push({...base,qaScore:qa.qualityScore,slides:renderPlan.slides.map(slide=>({slideNumber:slide.slideNumber,headline:slide.headline,subhead:slide.subhead,body:slide.body,cta:slide.cta})),renderPlan});
      continue;
    }

    const videoPlan = {
      ...base,
      hook:renderPlan.hook,
      voiceover:renderPlan.beats.map(beat=>beat.voiceover).filter(Boolean).join(' ') || scriptBody(brief.headline,brief.supportingCopy,route.singleBigIdea,brief.cta),
      durationSeconds:renderPlan.durationSeconds,
      selectedSegmentIds:renderPlan.selectedSegmentIds,
      shotSequence:renderPlan.beats.map(beat=>({start:beat.start,end:beat.end,purpose:beat.purpose,visual:beat.visual,onScreenText:beat.onScreenText,voiceover:beat.voiceover})),
      editNotes:renderPlan.filmingNotes,
      cta:brief.cta
    };

    if (route.format === 'talking-head' || route.format === 'talking-head-captions' || route.format === 'founder-story-video') {
      talkingHeadScripts.push({
        ...base,
        hook:brief.headline,
        fullScript:scriptBody(brief.headline,brief.supportingCopy,route.singleBigIdea,brief.cta),
        alternateHooks:[route.primaryHook,route.singleBigIdea].filter((value,index,array)=>Boolean(value) && array.indexOf(value)===index),
        deliveryNotes:[
          ...renderPlan.filmingNotes,
          'Deliver the hook as a complete thought before adding context.',
          'Natural language beats polished ad-read delivery.'
        ],
        brollInsertIdeas:renderPlan.beats.filter(beat=>beat.purpose!=='hook').map(beat=>beat.visual),
        onScreenText:renderPlan.beats.map(beat=>beat.onScreenText).filter((value):value is string=>Boolean(value)),
        cta:brief.cta
      });
    } else if (route.format === 'broll-text' || route.format === 'broll-voiceover' || route.format === 'ugc-demo') {
      brollAds.push(videoPlan);
    } else {
      otherVideoPlans.push(videoPlan);
    }
  }

  return AgencyDeliveryPackSchema.parse({staticAds,brollAds,talkingHeadScripts,carousels,otherVideoPlans,warnings:output.warnings});
}

export type AgencyDeliveryPack = z.infer<typeof AgencyDeliveryPackSchema>;
