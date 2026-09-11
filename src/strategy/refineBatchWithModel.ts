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

const agencyQualityBar = [
  'This is internal agency work, not a demo. Every concept should be strong enough that a senior Meta ads strategist would seriously consider putting it in front of a paying client.',
  'A concept fails if its hook could be pasted onto an unrelated coaching, ecommerce, or SaaS brand with only the noun changed.',
  'Do not expose internal strategy labels such as Desired Outcome, Cost of the Current Way, The Objection, Campaign Priority, Proven Direction, old way, better way, or current approach unless those exact words are genuinely compelling customer-facing copy.',
  'Do not manufacture contrast simply because the seed archetype is a comparison. Find the specific belief, behavior, decision, tradeoff, mechanism, or moment that creates the contrast for this offer.',
  'Prefer concrete buyer moments, exact customer language, specific consequences, vivid observations, credible mechanisms, and sharp points of view over abstract marketing language.',
  'Do not write placeholders disguised as copy: no more useful path, desired outcome, upgrade, game changer, level up, unlock, transform your business, stop guessing, work smarter, or similar generic filler unless the supplied customer language specifically supports it.',
  'For founder-led brands, copy should sound like something this founder could plausibly say out loud. For educational/service brands, preserve nuance and expertise instead of forcing every thought into a slogan.',
  'Judge the batch as media-buying inventory: concepts should cover meaningfully different reasons to care, not twelve cosmetic variations of the same thesis.'
].join(' ');

/** Refines the whole route set in one model call so the model can actively create contrast across the batch. */
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
      'You are the senior paid-social creative director at After Organic. Refine the entire proposed creative batch together.',
      agencyQualityBar,
      'Return exactly one refined item for every supplied routeId and do not invent routeIds.',
      'Preserve each route’s angle, archetype, format, treatment, and style as production constraints, but completely rewrite weak seed thinking. The seed copy is scaffolding, not approved language.',
      'The batch must feel intentionally varied: avoid repeating the same hook grammar, visual device, emotional register, founder pose, or comparison idea across multiple concepts.',
      'Each concept gets one big idea. Hooks should sound like sharp human advertising, not generic marketing templates or AI copy.',
      'Use the offer mechanism, audience language, objections, desires, and available media. Make visuals concrete enough that a designer or creator can picture the ad.',
      'Use real founder imagery when trust matters and a strong founder asset exists. Use real product/interface media when credibility benefits from it.',
      'Never invent testimonials, statistics, customer counts, guarantees, features, revenue, performance outcomes, or proof not supplied in the context.',
      'Do not create generic AI imagery such as robots, glowing brains, random magic sparkles, rockets, generic laptop people, or floating dashboards unless strategically necessary.',
      'Score critically. A score in the 70s can be viable; reserve 90+ for genuinely exceptional routes. If a route is weak, lower the score rather than flattering it.'
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
      'You are the production creative director at After Organic. Refine this entire batch of Meta ad briefs together.',
      agencyQualityBar,
      'Return exactly one brief for every supplied routeId. Preserve the strategy and format of each route, but replace any generic seed copy.',
      'Customer-facing headlines and support copy must sound natural, specific, and immediately understandable on a phone.',
      'Do not repeat the same opening phrase, cadence, claim, or visual composition across the batch simply because it worked once.',
      'Supporting copy must add a second useful thought. Return null when there is no strong supporting line rather than filler, category labels, or fragments.',
      'Visual concepts must specify concrete subjects/actions/compositions and explain why that visual helps communicate the idea. The visual should add meaning rather than literally duplicate the headline.',
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
