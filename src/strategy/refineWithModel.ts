import { z } from 'zod';
import type { CreativeEngineInput, CreativeRoute, CreativeBrief } from '../schemas/index.js';
import type { ModelProvider } from '../providers/modelProvider.js';

const RefinedRouteSchema = z.object({
  conceptName:z.string().min(2), singleBigIdea:z.string().min(5), primaryHook:z.string().min(3), visualSummary:z.string().min(5), whyItFits:z.string().min(5),
  scores:z.object({ strategicClarity:z.number().min(0).max(100), visualStopPower:z.number().min(0).max(100), relevance:z.number().min(0).max(100), specificity:z.number().min(0).max(100), glanceComprehension:z.number().min(0).max(100) })
});

const RefinedBriefSchema = z.object({
  headline:z.string().min(3), supportingCopy:z.string().optional(), cta:z.string().optional(), visualConcept:z.string().min(5), composition:z.string().min(5), focalPoint:z.string().min(3), mustInclude:z.array(z.string()).default([]), mustAvoid:z.array(z.string()).default([])
});

function context(input:CreativeEngineInput, route:CreativeRoute){
  const angle = input.angles.find(a=>a.id===route.angleId);
  return {
    offer:input.offer,
    audience:input.audience,
    angle,
    brand:input.brand,
    routeSeed:route,
    mediaSummary:input.mediaAssets.map(a=>({ id:a.id,type:a.type,founderPresent:a.founderPresent,faceVisible:a.faceVisible,tags:a.tags,trustPotential:a.trustPotential,textOverlaySuitability:a.textOverlaySuitability }))
  };
}

export async function refineRouteWithModel(input:CreativeEngineInput, route:CreativeRoute, provider:ModelProvider):Promise<CreativeRoute>{
  const raw = await provider.generate<typeof context extends (...args:any)=>infer R ? R : never, unknown>({
    task:'route-ideation', input:context(input,route), responseSchemaName:'RefinedCreativeRoute',
    system:'Refine this seed into a specific, non-generic Meta ad concept. Preserve the selected angle, archetype, format, treatment, and style. One big idea only. Use audience language when useful. Do not invent proof, testimonials, metrics, features, or claims. Avoid generic AI/SaaS tropes. The hook and visual should complement each other rather than repeat each other.'
  });
  const refined = RefinedRouteSchema.parse(raw);
  return { ...route, ...refined, id:route.id, angleId:route.angleId, archetypeId:route.archetypeId, format:route.format, productionTreatmentId:route.productionTreatmentId, styleId:route.styleId };
}

export async function refineBriefWithModel(input:CreativeEngineInput, route:CreativeRoute, brief:CreativeBrief, provider:ModelProvider):Promise<CreativeBrief>{
  const raw = await provider.generate<unknown,unknown>({
    task:'creative-brief',
    input:{ ...context(input,route), briefSeed:brief },
    responseSchemaName:'RefinedCreativeBrief',
    system:'Turn the seed into a production-ready creative brief. Keep every claim grounded in supplied offer data. Preserve brand typography/colors/photography rules. Headline must be clear at a glance and sound like a human, not internal strategy language. Supporting copy must make sense standalone; omit it rather than outputting an orphan fragment. For founder-led offers, prefer authentic founder imagery when a strong asset exists. Never put production directions into customer-facing copy.'
  });
  const refined = RefinedBriefSchema.parse(raw);
  return { ...brief, ...refined, routeId:brief.routeId, brandAdaptation:brief.brandAdaptation, mustInclude:[...new Set([...brief.mustInclude,...refined.mustInclude])], mustAvoid:[...new Set([...brief.mustAvoid,...refined.mustAvoid])] };
}
