export * from "./schemas/index.js";
export * from "./libraries/archetypes.js";

import {
  CreativeEngineInputSchema,
  CreativeEngineOutputSchema,
  type CreativeEngineInput,
  type CreativeEngineOutput
} from "./schemas/index.js";

export const ENGINE_VERSION = "0.1.0";

/**
 * Main orchestration boundary consumed by the Lumi app.
 *
 * V0.1 deliberately validates the contract before any model/provider logic is
 * introduced. Strategy generation, media matching, compilation and QA will be
 * added behind this stable boundary.
 */
export async function generateCreativeSet(
  rawInput: CreativeEngineInput
): Promise<CreativeEngineOutput> {
  const input = CreativeEngineInputSchema.parse(rawInput);

  const output: CreativeEngineOutput = {
    requestId: input.requestId,
    engineVersion: ENGINE_VERSION,
    concepts: [],
    warnings: [
      "Creative generation providers are not connected yet. Contract validation succeeded."
    ]
  };

  return CreativeEngineOutputSchema.parse(output);
}
