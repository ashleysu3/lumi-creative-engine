export type JsonSchema = Record<string, unknown>;

const scoreProperties = {
  strategicClarity: { type: 'number', minimum: 0, maximum: 100 },
  visualStopPower: { type: 'number', minimum: 0, maximum: 100 },
  relevance: { type: 'number', minimum: 0, maximum: 100 },
  specificity: { type: 'number', minimum: 0, maximum: 100 },
  glanceComprehension: { type: 'number', minimum: 0, maximum: 100 }
};

export const OPENAI_RESPONSE_SCHEMAS: Record<string, JsonSchema> = {
  RefinedCreativeRoute: {
    type: 'object',
    additionalProperties: false,
    properties: {
      conceptName: { type: 'string' },
      singleBigIdea: { type: 'string' },
      primaryHook: { type: 'string' },
      visualSummary: { type: 'string' },
      whyItFits: { type: 'string' },
      scores: {
        type: 'object',
        additionalProperties: false,
        properties: scoreProperties,
        required: Object.keys(scoreProperties)
      }
    },
    required: ['conceptName','singleBigIdea','primaryHook','visualSummary','whyItFits','scores']
  },
  RefinedCreativeBrief: {
    type: 'object',
    additionalProperties: false,
    properties: {
      headline: { type: 'string' },
      supportingCopy: { type: ['string','null'] },
      cta: { type: ['string','null'] },
      visualConcept: { type: 'string' },
      composition: { type: 'string' },
      focalPoint: { type: 'string' },
      mustInclude: { type: 'array', items: { type: 'string' } },
      mustAvoid: { type: 'array', items: { type: 'string' } }
    },
    required: ['headline','supportingCopy','cta','visualConcept','composition','focalPoint','mustInclude','mustAvoid']
  }
};

export function getOpenAIResponseSchema(name?: string): JsonSchema | undefined {
  return name ? OPENAI_RESPONSE_SCHEMAS[name] : undefined;
}
