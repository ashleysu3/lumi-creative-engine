export * from './schemas/index.js';
export * from './libraries/archetypes.js';
export * from './libraries/formats.js';
export * from './libraries/treatments.js';
export * from './libraries/styles.js';
export * from './strategy/scoreArchetypes.js';
export * from './strategy/buildCreativeMix.js';
export * from './strategy/generateRoutes.js';
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
import { batchRedundancyCheck } from './strategy/batchRedundancyCheck.js';
import { generateCreativeBrief } from './briefs/generateCreativeBrief.js';
import { matchMedia } from './briefs/matchMedia.js';
import { qualityCheck } from './qa/qualityCheck.js';
import { compileCreativeOutput } from './rendering/compileCreativeOutput.js';

export const ENGINE_VERSION = '0.3.0';

/** Stable orchestration boundary consumed by Lumi. */
export async function generateCreativeSet(rawInput: CreativeEngineInput): Promise<CreativeEngineOutput> {
  const input = CreativeEngineInputSchema.parse(rawInput);
  const routes = generateRoutes(input);
  const concepts = routes.map(route => {
    const brief = generateCreativeBrief(input, route);
    const mediaMatch = matchMedia(input, route);
    const qa = qualityCheck(input, route, brief, mediaMatch);
    const renderPlan = compileCreativeOutput(route, brief, mediaMatch);
    return { route, brief, mediaMatch, qa, renderPlan };
  });

  const warnings: string[] = [];
  const blocked = concepts.filter(c => c.qa.status === 'blocked').length;
  if (blocked) warnings.push(`${blocked} concept${blocked === 1 ? '' : 's'} blocked by pre-render QA.`);
  if (!input.mediaAssets.length) warnings.push('No uploaded media supplied; concepts will require generated or newly uploaded assets.');

  const redundancy = batchRedundancyCheck(routes);
  for (const issue of redundancy) {
    warnings.push(`Creative mix redundancy: ${issue.dimension} "${issue.value}" appears in ${issue.routeIds.length} routes (${issue.severity}).`);
  }

  const output: CreativeEngineOutput = {
    requestId: input.requestId,
    engineVersion: ENGINE_VERSION,
    concepts,
    warnings
  };

  return CreativeEngineOutputSchema.parse(output);
}
