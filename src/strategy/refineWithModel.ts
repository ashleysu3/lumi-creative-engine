import { z } from 'zod';
import type { CreativeEngineInput, CreativeRoute, CreativeBrief } from '../schemas/index.js';
import type { ModelProvider } from '../providers/modelProvider.js';

const RefinedRouteSchema = z.object({
  conceptName:z.string().min(2), singleBigIdea:z.string().min(5), primaryHook:z.string().min(3), visualSummary:z.string().min(5), whyItFits:z.string().min(5),
  scores:z.object({ strategicClarity:z.number().min(0).max(100), visualStopPower:z.number().min(0).max(100), relevance:z.number().min(0).max(100), specificity:z.number().min(0).max(100), glanceComprehension:z.number().min(0).max(100) })
});

const RefinedBriefSchema = z.object({
  headline:z.string().min(3), supportingCopy:z.string().nullable().optional(), cta:z.string().nullable().optional(), visualConcept:z.string().min(5), composition:z.string().min(5), focalPoint:z.string().min(3), mustInclude:z.array(z.string()).default([]), mustAvoid:z.array(z.string()).default([])
});

function context(input:CreativeEngineInput, route:CreativeRoute){
  const angle = input.angles.find(a=>a.id===route.angleId);
  return {
    offer:input.offer,
    audience:input.audience,
    angle,
    brand:input.brand,
    routeSeed:route,
    mediaSummary:input.mediaAssets.map(a=>({
      id:a.id,type:a.type,orientation:a.orientation,founderPresent:a.founderPresent,faceVisible:a.faceVisible,
      tags:a.tags,trustPotential:a.trustPotential,textOverlaySuitability:a.textOverlaySuitability,
      nativeFeedFeel:a.nativeFeedFeel,segments:a.segments
    }))
  };
}

export async function refineRouteWithModel(input:CreativeEngineInput, route:CreativeRoute, provider:ModelProvider):Promise<CreativeRoute>{
  const raw = await provider.generate<ReturnType<typeof context>, unknown>({
    task:'route-ideation', input:context(input,route), responseSchemaName:'RefinedCreativeRoute',
    system:[
      'You are Ads by Lumi creative director. Refine this seed into a specific Meta ad concept that a senior paid-social strategist would actually want to test.',
      'Preserve the selected angle, archetype, format, production treatment, and style. Do not switch the strategic route.',
      'One big idea per concept. The hook should create tension, curiosity, recognition, or desire without sounding like a generic marketing template.',
      'Use concrete customer language and the supplied offer mechanism. Favor specificity over cleverness.',
      'The visual must add information or emotional force; it should not merely illustrate the headline literally.',
      'Use real founder/product media strategically when the supplied assets make that stronger.',
      'Do not invent proof, testimonials, metrics, features, guarantees, customer counts, revenue claims, or outcomes.',
      'Avoid generic AI/SaaS tropes: robots, glowing brains, magic sparkles, random gradients, floating dashboards, rockets, or generic smiling laptop people unless the concept truly requires one.',
      'Score the concept critically. Do not give every route 95+.'
    ].join(' ')
  });
  const refined = RefinedRouteSchema.parse(raw);
  return { ...route, ...refined, id:route.id, angleId:route.angleId, archetypeId:route.archetypeId, format:route.format, productionTreatmentId:route.productionTreatmentId, styleId:route.styleId };
}

export async function refineBriefWithModel(input:CreativeEngineInput, route:CreativeRoute, brief:CreativeBrief, provider:ModelProvider):Promise<CreativeBrief>{
  const raw = await provider.generate<unknown,unknown>({
    task:'creative-brief',
    input:{ ...context(input,route), briefSeed:brief },
    responseSchemaName:'RefinedCreativeBrief',
    system:[
      'You are Ads by Lumi production creative director. Turn the seed into a production-ready Meta ad brief.',
      'Keep every claim grounded in supplied offer data. Never manufacture social proof, numbers, testimonials, results, guarantees, features, or customer statements.',
      'The headline must be immediately understandable on a phone and sound like something a sharp human strategist wrote, not an internal strategy label.',
      'Supporting copy must add a second useful thought and make sense standalone. Return null instead of a vague fragment, category label, or filler.',
      'The visual concept must name a concrete subject, action, composition, or visual device. Do not say only “use an engaging image.”',
      'For founder-led or trust-sensitive offers, prefer authentic founder imagery when a strong supplied asset exists. For software, use real product UI when that makes the claim more believable.',
      'Preserve the supplied brand typography, palette, photography treatment, and motifs as hard constraints. Temporary style never overrides the brand system.',
      'Never put production directions such as CARD 1, HOOK, HEADLINE, SUBHEAD, LEFT SIDE, SHOW, or CTA SLIDE into customer-facing copy.',
      'Keep one big idea. Mobile readability matters more than squeezing every selling point into the creative.'
    ].join(' ')
  });
  const refined = RefinedBriefSchema.parse(raw);
  return {
    ...brief,
    ...refined,
    supportingCopy: refined.supportingCopy ?? brief.supportingCopy,
    cta: refined.cta ?? brief.cta,
    routeId:brief.routeId,
    brandAdaptation:brief.brandAdaptation,
    mustInclude:[...new Set([...brief.mustInclude,...refined.mustInclude])],
    mustAvoid:[...new Set([...brief.mustAvoid,...refined.mustAvoid])]
  };
}
