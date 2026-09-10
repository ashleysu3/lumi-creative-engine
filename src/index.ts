export * from './schemas/index.js';
export * from './libraries/archetypes.js';
export * from './libraries/formats.js';
export * from './libraries/treatments.js';
export * from './libraries/styles.js';
export * from './strategy/scoreArchetypes.js';
export * from './strategy/buildCreativeMix.js';
export * from './strategy/generateRoutes.js';
export * from './strategy/refineWithModel.js';
export * from './strategy/refineBatchWithModel.js';
export * from './strategy/batchRedundancyCheck.js';
export * from './briefs/generateCreativeBrief.js';
export * from './briefs/matchMedia.js';
export * from './qa/semanticQA.js';
export * from './qa/qualityCheck.js';
export * from './qa/postRenderVisualQA.js';
export * from './rendering/compileCreativeOutput.js';
export * from './rendering/renderProvider.js';
export * from './rendering/svgCompositionProvider.js';
export * from './rendering/renderPipeline.js';
export * from './rendering/autoFix.js';
export * from './rendering/versioning.js';
export * from './providers/modelProvider.js';
export * from './providers/openaiModelProvider.js';
export * from './providers/openaiImageProvider.js';
export * from './providers/openaiResponseSchemas.js';
export * from './studio/profileSchemas.js';
export * from './studio/engineAdapter.js';
export * from './studio/deliverables.js';
export * from './studio/websiteResearch.js';
export * from './studio/refineWebsiteResearch.js';
export * from './studio/researchCleanup.js';

import {
  CreativeEngineInputSchema,
  CreativeEngineOutputSchema,
  type CreativeEngineInput,
  type CreativeEngineOutput,
  type CreativeRoute,
  type CreativeBrief
} from './schemas/index.js';
import { generateRoutes } from './strategy/generateRoutes.js';
import { refineRouteWithModel, refineBriefWithModel } from './strategy/refineWithModel.js';
import { refineRoutesBatchWithModel, refineBriefsBatchWithModel } from './strategy/refineBatchWithModel.js';
import { batchRedundancyCheck } from './strategy/batchRedundancyCheck.js';
import { generateCreativeBrief } from './briefs/generateCreativeBrief.js';
import { matchMedia, type MediaUsageCounts } from './briefs/matchMedia.js';
import { qualityCheck } from './qa/qualityCheck.js';
import { compileCreativeOutput } from './rendering/compileCreativeOutput.js';
import type { ModelProvider } from './providers/modelProvider.js';

export const ENGINE_VERSION = '0.9.1';

export type GenerateCreativeSetOptions = {
  modelProvider?: ModelProvider;
  refineRoutes?: boolean;
  refineBriefs?: boolean;
  /** Batch refinement is the production default: two coordinated model calls per creative set instead of two calls per creative. */
  modelBatching?: boolean;
};

async function refineRoutes(
  input:CreativeEngineInput,
  seededRoutes:CreativeRoute[],
  options:GenerateCreativeSetOptions
):Promise<{ routes:CreativeRoute[]; warning?:string }> {
  if (!options.modelProvider || options.refineRoutes === false) return { routes:seededRoutes };
  if (options.modelBatching !== false) {
    try {
      return { routes:await refineRoutesBatchWithModel(input,seededRoutes,options.modelProvider) };
    } catch (error) {
      return { routes:seededRoutes, warning:`Batch route refinement failed; deterministic routes used. ${error instanceof Error ? error.message : ''}`.trim() };
    }
  }
  const routes = await Promise.all(seededRoutes.map(async route => {
    try { return await refineRouteWithModel(input,route,options.modelProvider!); }
    catch { return route; }
  }));
  return { routes };
}

async function refineBriefs(
  input:CreativeEngineInput,
  routes:CreativeRoute[],
  seededBriefs:CreativeBrief[],
  options:GenerateCreativeSetOptions
):Promise<{ briefs:CreativeBrief[]; warning?:string }> {
  if (!options.modelProvider || options.refineBriefs === false) return { briefs:seededBriefs };
  if (options.modelBatching !== false) {
    try {
      return { briefs:await refineBriefsBatchWithModel(input,routes,seededBriefs,options.modelProvider) };
    } catch (error) {
      return { briefs:seededBriefs, warning:`Batch brief refinement failed; deterministic briefs used. ${error instanceof Error ? error.message : ''}`.trim() };
    }
  }
  const briefs = await Promise.all(routes.map(async (route,index) => {
    try { return await refineBriefWithModel(input,route,seededBriefs[index],options.modelProvider!); }
    catch { return seededBriefs[index]; }
  }));
  return { briefs };
}

/** Stable creative-engine boundary consumed by the agency studio and future product surfaces. */
export async function generateCreativeSet(rawInput: CreativeEngineInput, options:GenerateCreativeSetOptions = {}): Promise<CreativeEngineOutput> {
  const input = CreativeEngineInputSchema.parse(rawInput);
  const seededRoutes = generateRoutes(input);
  const routeResult = await refineRoutes(input,seededRoutes,options);
  const routes = routeResult.routes;

  const seededBriefs = routes.map(route=>generateCreativeBrief(input,route));
  const briefResult = await refineBriefs(input,routes,seededBriefs,options);
  const briefs = briefResult.briefs;

  const usageCounts:MediaUsageCounts = {};
  const concepts = routes.map((route,index) => {
    const brief = briefs[index];
    const mediaMatch = matchMedia(input,route,usageCounts);
    if (mediaMatch.primaryAssetId) usageCounts[mediaMatch.primaryAssetId] = (usageCounts[mediaMatch.primaryAssetId] ?? 0) + 1;
    const qa = qualityCheck(input,route,brief,mediaMatch);
    const renderPlan = compileCreativeOutput(route,brief,mediaMatch);
    return { route, brief, mediaMatch, qa, renderPlan };
  });

  const warnings: string[] = [];
  if (routeResult.warning) warnings.push(routeResult.warning);
  if (briefResult.warning) warnings.push(briefResult.warning);
  const blocked = concepts.filter(c => c.qa.status === 'blocked').length;
  if (blocked) warnings.push(`${blocked} concept${blocked === 1 ? '' : 's'} blocked by pre-render QA.`);
  if (!input.mediaAssets.length) warnings.push('No uploaded media supplied; concepts will require generated or newly uploaded assets.');
  if (options.modelProvider && (options.refineRoutes === false || options.refineBriefs === false)) warnings.push('Model provider supplied with one or more refinement stages disabled.');

  const redundancy = batchRedundancyCheck(routes);
  for (const issue of redundancy) warnings.push(`Creative mix redundancy: ${issue.dimension} "${issue.value}" appears in ${issue.routeIds.length} routes (${issue.severity}).`);

  const repeatedMedia = Object.entries(usageCounts).filter(([,count])=>count>2);
  for (const [assetId,count] of repeatedMedia) warnings.push(`Media diversity: asset "${assetId}" is used in ${count} concepts; consider adding more suitable media.`);

  const output: CreativeEngineOutput = { requestId: input.requestId, engineVersion: ENGINE_VERSION, concepts, warnings };
  return CreativeEngineOutputSchema.parse(output);
}
