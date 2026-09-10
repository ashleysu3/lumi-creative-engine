import { z } from 'zod';
import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../schemas/index.js';
import type { ModelProvider } from '../providers/modelProvider.js';

const scoreSchema = z.object({
  strategicClarity:z.number().min(0).max(100),
  visualStopPower:z.number().min(0).max(100),
  relevance:z.number().min(0).max(100),
  specificity:z.number().min(0).max(100),
  glanceComprehension:z.number().min(0).max(100)
});

const RouteItemSchema = z.object({
  routeId:z.string(),
  conceptName:z.string().min(2),
  singleBigIdea:z.string().min(5),
  primaryHook:z.string().min(3),
  visualSummary:z.string().min(5),
  whyItFits:z.string().min(5),
  scores:scoreSchema
});
const RouteBatchSchema = z.object({ routes:z.array(RouteItemSchema) });

const BriefItemSchema = z.object({
  routeId:z.string(),
  headline:z.string().min(3),
  supportingCopy:z.string().nullable(),
  cta:z.string().nullable(),
  visualConcept:z.string().min(5),
  composition:z.string().min(5),
  focalPoint:z.string().min(3),
  mustInclude:z.array(z.string()),
  mustAvoid:z.array(z.string())
});
const BriefBatchSchema = z.object({ briefs:z.array(BriefItemSchema) });

function sharedContext(input:CreativeEngineInput) {
  return {
    offer:input.offer,
    audience:input.audience,
    brand:input.brand,
    angles:input.angles,
    mediaSummary:input.mediaAssets.map(a=>({
      id:a.id,type:a.type,orientation:a.orientation,founderPresent:a.founderPresent,faceVisible:a.faceVisible,
      tags:a.tags,trustPotential:a.trustPotential,textOverlaySuitability:a.textOverlaySuitability,
      nativeFeedFeel:a.nativeFeedFeel,segments:a.segments
    }))
  };
}

/**
 * Refines the whole route set in one model call so the model can actively create
 * contrast across the batch instead of optimizing each concept in isolation.
 */
export async function refineRoutesBatchWithModel(
  input:CreativeEngineInput,
  routes:CreativeRoute[],
  provider:ModelProvider
):Promise<CreativeRoute[]> {
  if (!routes.length) return routes;
  const raw = await provider.generate<unknown,unknown>({
    task:'route-ideation',
    input:{ ...sharedContext(input), routeSeeds:routes },
    responseSchemaName:'RefinedCreativeRouteBatch',
    system:[
      'You are Ads by Lumi senior paid-social creative director. Refine the entire proposed creative batch together.',
      'Return exactly one refined item for every supplied routeId and do not invent routeIds.',
      'Preserve each route’s angle, archetype, format, treatment, and style. Improve only the creative thinking inside that route.',
      'The batch must feel intentionally varied: avoid repeating the same hook grammar, visual device, emotional register, founder pose, or “old vs new” idea across multiple concepts.',
      'Each concept gets one big idea. Hooks should sound like sharp human advertising, not generic marketing templates or AI copy.',
      'Use the offer mechanism, audience language, objections, desires, and available media. Make visuals concrete enough that a designer or creator can picture the ad.',
      'Use real founder imagery when trust matters and a strong founder asset exists. Use real product UI when software credibility benefits from it.',
      'Never invent testimonials, statistics, customer counts, guarantees, features, revenue, performance outcomes, or proof not supplied in the context.',
      'Do not create generic AI imagery such as robots, glowing brains, random magic sparkles, rockets, generic laptop people, or floating dashboards unless strategically necessary.',
      'Score critically. A score in the 70s can be a viable concept; reserve 90+ for genuinely exceptional routes.'
    ].join(' ')
  });
  const parsed = RouteBatchSchema.parse(raw);
  const byId = new Map(parsed.routes.map(r=>[r.routeId,r]));
  return routes.map(seed=>{
    const refined = byId.get(seed.id);
    if (!refined) return seed;
    return {
      ...seed,
      conceptName:refined.conceptName,
      singleBigIdea:refined.singleBigIdea,
      primaryHook:refined.primaryHook,
      visualSummary:refined.visualSummary,
      whyItFits:refined.whyItFits,
      scores:refined.scores
    };
  });
}

/** Refines all briefs in one pass so copy and art direction stay distinct across the batch. */
export async function refineBriefsBatchWithModel(
  input:CreativeEngineInput,
  routes:CreativeRoute[],
  briefs:CreativeBrief[],
  provider:ModelProvider
):Promise<CreativeBrief[]> {
  if (!briefs.length) return briefs;
  const raw = await provider.generate<unknown,unknown>({
    task:'creative-brief',
    input:{
      ...sharedContext(input),
      concepts:routes.map((route,index)=>({ route, briefSeed:briefs[index] }))
    },
    responseSchemaName:'RefinedCreativeBriefBatch',
    system:[
      'You are Ads by Lumi production creative director. Refine this entire batch of Meta ad briefs together.',
      'Return exactly one brief for every supplied routeId. Preserve the strategy and format of each route.',
      'Customer-facing headlines and support copy must sound natural, specific, and immediately understandable on a phone.',
      'Do not repeat the same opening phrase, cadence, claim, or visual composition across the batch simply because it worked once.',
      'Supporting copy should add a second useful thought. Return null when there is no strong supporting line rather than filler, category labels, or fragments.',
      'Visual concepts must specify concrete subjects/actions/compositions. The visual should add meaning rather than literally duplicate the headline.',
      'Founder-led offers should strategically use supplied founder media where it increases trust; software concepts should use real interface media where it increases believability.',
      'Brand colors, typography, photography rules, prohibited colors, motifs, and avoid lists are hard constraints.',
      'Never invent proof, testimonials, metrics, results, guarantees, features, or claims that are absent from the supplied offer.',
      'Never leak production-language labels such as CARD 1, HOOK, HEADLINE:, SUBHEAD:, LEFT SIDE, SHOW, DRAW, VISUAL SHOULD, or CTA SLIDE into customer-facing copy.',
      'Keep each creative focused on one big idea and prioritize feed readability over information density.'
    ].join(' ')
  });
  const parsed = BriefBatchSchema.parse(raw);
  const byId = new Map(parsed.briefs.map(b=>[b.routeId,b]));
  return briefs.map(seed=>{
    const refined = byId.get(seed.routeId);
    if (!refined) return seed;
    return {
      ...seed,
      headline:refined.headline,
      supportingCopy:refined.supportingCopy ?? seed.supportingCopy,
      cta:refined.cta ?? seed.cta,
      visualConcept:refined.visualConcept,
      composition:refined.composition,
      focalPoint:refined.focalPoint,
      mustInclude:[...new Set([...seed.mustInclude,...refined.mustInclude])],
      mustAvoid:[...new Set([...seed.mustAvoid,...refined.mustAvoid])]
    };
  });
}
