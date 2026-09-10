export * from './schemas/index.js';
export * from './libraries/archetypes.js';
export * from './libraries/formats.js';
export * from './libraries/treatments.js';
export * from './libraries/styles.js';
export * from './strategy/scoreArchetypes.js';
export * from './strategy/buildCreativeMix.js';
export * from './strategy/generateRoutes.js';
export * from './strategy/refineWithModel.js';
export * from './strategy/batchRedundancyCheck.js';
export * from './briefs/generateCreativeBrief.js';
export * from './briefs/matchMedia.js';
export * from './qa/semanticQA.js';
export * from './qa/qualityCheck.js';
export * from './qa/postRenderVisualQA.js';
export * from './rendering/compileCreativeOutput.js';
export * from './rendering/renderProvider.js';
export * from './rendering/autoFix.js';
export * from './rendering/versioning.js';
export * from './providers/modelProvider.js';

import {
  CreativeEngineInputSchema,
  CreativeEngineOutputSchema,
  type CreativeEngineInput,
  type CreativeEngineOutput
} from './schemas/index.js';
import { generateRoutes } from './strategy/generateRoutes.js';
import { refineRouteWithModel, refineBriefWithModel } from './strategy/refineWithModel.js';
import { batchRedundancyCheck } from './strategy/batchRedundancyCheck.js';
import { generateCreativeBrief } from './briefs/generateCreativeBrief.js';
import { matchMedia } from './briefs/matchMedia.js';
import { qualityCheck } from './qa/qualityCheck.js';
import { compileCreativeOutput } from './rendering/compileCreativeOutput.js';
import type { ModelProvider } from './providers/modelProvider.js';

export const ENGINE_VERSION = '0.3.0';

export type GenerateCreativeSetOptions = {
  modelProvider?: ModelProvider;
  refineRoutes?: boolean;
  refineBriefs?: boolean;
};

/** Stable orchestration boundary consumed by Lumi. */
export async function generateCreativeSet(rawInput: CreativeEngineInput, options:GenerateCreativeSetOptions = {}): Promise<CreativeEngineOutput> {
  const input = CreativeEngineInputSchema.parse(rawInput);
  const seededRoutes = generateRoutes(input);
  const useModelRoutes = Boolean(options.modelProvider && options.refineRoutes !== false);
  const useModelBriefs = Boolean(options.modelProvider && options.refineBriefs !== false);

  const routes = useModelRoutes && options.modelProvider
    ? await Promise.all(seededRoutes.map(async route => {
        try { return await refineRouteWithModel(input, route, options.modelProvider!); }
        catch { return route; }
      }))
    : seededRoutes;

  const concepts = await Promise.all(routes.map(async route => {
    const seededBrief = generateCreativeBrief(input, route);
    const brief = useModelBriefs && options.modelProvider
      ? await refineBriefWithModel(input, route, seededBrief, options.modelProvider).catch(() => seededBrief)
      : seededBrief;
    const mediaMatch = matchMedia(input, route);
    const qa = qualityCheck(input, route, brief, mediaMatch);
    const renderPlan = compileCreativeOutput(route, brief, mediaMatch);
    return { route, brief, mediaMatch, qa, renderPlan };
  }));

  const warnings: string[] = [];
  const blocked = concepts.filter(c => c.qa.status === 'blocked').length;
  if (blocked) warnings.push(`${blocked} concept${blocked === 1 ? '' : 's'} blocked by pre-render QA.`);
  if (!input.mediaAssets.length) warnings.push('No uploaded media supplied; concepts will require generated or newly uploaded assets.');
  if (options.modelProvider && (!useModelRoutes || !useModelBriefs)) warnings.push('Model provider supplied with one or more refinement stages disabled.');

  const redundancy = batchRedundancyCheck(routes);
  for (const issue of redundancy) warnings.push(`Creative mix redundancy: ${issue.dimension} "${issue.value}" appears in ${issue.routeIds.length} routes (${issue.severity}).`);

  const output: CreativeEngineOutput = { requestId: input.requestId, engineVersion: ENGINE_VERSION, concepts, warnings };
  return CreativeEngineOutputSchema.parse(output);
}
