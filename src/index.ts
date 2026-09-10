export * from './schemas/index.js';
export * from './libraries/archetypes.js';
export * from './libraries/formats.js';
export * from './libraries/treatments.js';
export * from './libraries/styles.js';
export * from './strategy/scoreArchetypes.js';
export * from './strategy/buildCreativeMix.js';
export * from './strategy/generateRoutes.js';
export * from './briefs/generateCreativeBrief.js';
export * from './briefs/matchMedia.js';
export * from './qa/semanticQA.js';
export * from './qa/qualityCheck.js';
export * from './rendering/compileCreativeOutput.js';

import {
  CreativeEngineInputSchema,
  CreativeEngineOutputSchema,
  type CreativeEngineInput,
  type CreativeEngineOutput
} from './schemas/index.js';
import { generateRoutes } from './strategy/generateRoutes.js';
import { generateCreativeBrief } from './briefs/generateCreativeBrief.js';
import { matchMedia } from './briefs/matchMedia.js';
import { qualityCheck } from './qa/qualityCheck.js';

export const ENGINE_VERSION = '0.2.0';

/**
 * Stable orchestration boundary consumed by Lumi.
 *
 * V0.2 contains the deterministic intelligence layer: creative mix planning,
 * archetype ranking, route generation, brief creation, media matching and
 * pre-render QA. Model-assisted ideation and rendering providers can be added
 * behind this boundary without changing the app contract.
 */
export async function generateCreativeSet(rawInput: CreativeEngineInput): Promise<CreativeEngineOutput> {
  const input = CreativeEngineInputSchema.parse(rawInput);
  const routes = generateRoutes(input);
  const concepts = routes.map(route => {
    const brief = generateCreativeBrief(input, route);
    const mediaMatch = matchMedia(input, route);
    const qa = qualityCheck(input, route, brief, mediaMatch);
    return { route, brief, mediaMatch, qa };
  });

  const warnings: string[] = [];
  const blocked = concepts.filter(c => c.qa.status === 'blocked').length;
  if (blocked) warnings.push(`${blocked} concept${blocked === 1 ? '' : 's'} blocked by pre-render QA.`);
  if (!input.mediaAssets.length) warnings.push('No uploaded media supplied; concepts will require generated or newly uploaded assets.');

  const output: CreativeEngineOutput = {
    requestId: input.requestId,
    engineVersion: ENGINE_VERSION,
    concepts,
    warnings
  };

  return CreativeEngineOutputSchema.parse(output);
}
