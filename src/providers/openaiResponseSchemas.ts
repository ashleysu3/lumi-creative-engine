export type JsonSchema = Record<string, unknown>;

const scoreProperties = {
  strategicClarity: { type: 'number', minimum: 0, maximum: 100 },
  visualStopPower: { type: 'number', minimum: 0, maximum: 100 },
  relevance: { type: 'number', minimum: 0, maximum: 100 },
  specificity: { type: 'number', minimum: 0, maximum: 100 },
  glanceComprehension: { type: 'number', minimum: 0, maximum: 100 }
};

const routeProperties = {
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
};

const briefProperties = {
  headline: { type: 'string' },
  supportingCopy: { type: ['string','null'] },
  cta: { type: ['string','null'] },
  visualConcept: { type: 'string' },
  composition: { type: 'string' },
  focalPoint: { type: 'string' },
  mustInclude: { type: 'array', items: { type: 'string' } },
  mustAvoid: { type: 'array', items: { type: 'string' } }
};

export const OPENAI_RESPONSE_SCHEMAS: Record<string, JsonSchema> = {
  RefinedCreativeRoute: {
    type: 'object',
    additionalProperties: false,
    properties: routeProperties,
    required: Object.keys(routeProperties)
  },
  RefinedCreativeBrief: {
    type: 'object',
    additionalProperties: false,
    properties: briefProperties,
    required: Object.keys(briefProperties)
  },
  RefinedCreativeRouteBatch: {
    type: 'object',
    additionalProperties: false,
    properties: {
      routes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { routeId:{ type:'string' }, ...routeProperties },
          required: ['routeId',...Object.keys(routeProperties)]
        }
      }
    },
    required: ['routes']
  },
  RefinedCreativeBriefBatch: {
    type: 'object',
    additionalProperties: false,
    properties: {
      briefs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { routeId:{ type:'string' }, ...briefProperties },
          required: ['routeId',...Object.keys(briefProperties)]
        }
      }
    },
    required: ['briefs']
  }
};

export function getOpenAIResponseSchema(name?: string): JsonSchema | undefined {
  return name ? OPENAI_RESPONSE_SCHEMAS[name] : undefined;
}
