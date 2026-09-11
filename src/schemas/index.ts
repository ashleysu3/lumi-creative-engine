import { z } from "zod";
import { CompiledCreativeOutputSchema } from "../rendering/renderSchemas.js";

export const CreativeFormatSchema = z.enum([
  "designed-static","editorial-static","lofi-native-graphic","notes-app","fake-message","search-bar","annotated-screenshot","ugc-photo-overlay","talking-head","talking-head-captions","broll-text","broll-voiceover","screen-recording","screen-recording-facecam","ugc-demo","founder-story-video","testimonial-video","carousel","comparison-carousel","motion-graphic","kinetic-typography","meme-reel","pov-video"
]);

export const TypographyRoleSchema = z.object({
  family:z.string().optional(),
  weight:z.number().int().min(100).max(1000).optional(),
  textTransform:z.enum(['none','uppercase','lowercase','capitalize']).optional(),
  tracking:z.number().optional(),
  lineHeight:z.number().positive().optional(),
  italic:z.boolean().optional()
});

export const BrandSystemSchema = z.object({
  colors: z.object({
    primary:z.array(z.string()).default([]), secondary:z.array(z.string()).default([]), accent:z.array(z.string()).default([]), background:z.array(z.string()).default([]), prohibited:z.array(z.string()).default([])
  }),
  typography: z.object({
    headlineFamily:z.string().optional(), bodyFamily:z.string().optional(), accentFamily:z.string().optional(),
    allowedWeights:z.array(z.number()).default([]), notes:z.array(z.string()).default([]),
    roles:z.object({
      headline:TypographyRoleSchema.optional(), subheadline:TypographyRoleSchema.optional(), body:TypographyRoleSchema.optional(), cta:TypographyRoleSchema.optional(), eyebrow:TypographyRoleSchema.optional(), accent:TypographyRoleSchema.optional()
    }).optional()
  }),
  photography: z.object({
    founderLed:z.boolean().default(false), styleNotes:z.array(z.string()).default([]), avoid:z.array(z.string()).default([]),
    lighting:z.array(z.string()).optional(), cropRules:z.array(z.string()).optional(), treatment:z.array(z.string()).optional()
  }),
  logoAssetIds:z.array(z.string()).default([]),
  logoRules:z.object({ clearSpace:z.string().optional(), minSize:z.string().optional(), preferredPlacements:z.array(z.string()).optional(), avoid:z.array(z.string()).optional() }).optional(),
  textures:z.array(z.string()).optional(),
  patterns:z.array(z.string()).optional(),
  motifs:z.array(z.string()).default([]),
  components:z.object({ cornerRadius:z.string().optional(), borderStyle:z.string().optional(), shadowStyle:z.string().optional(), buttonStyle:z.string().optional() }).optional(),
  layout:z.object({ density:z.enum(['airy','balanced','dense']).optional(), spacingNotes:z.array(z.string()).optional(), personality:z.array(z.string()).optional() }).optional(),
  approvedExamples:z.array(z.string()).optional(),
  avoidExamples:z.array(z.string()).optional(),
  avoid:z.array(z.string()).default([])
});

export const MediaSegmentSchema = z.object({
  id:z.string(), startSeconds:z.number().min(0), endSeconds:z.number().min(0),
  tags:z.array(z.string()).default([]), purposeHints:z.array(z.string()).default([]), score:z.number().min(0).max(100).optional()
});

export const MediaAssetSchema = z.object({
  id:z.string(), type:z.enum(["image","video","screenshot","logo","other"]), url:z.string().optional(),
  width:z.number().optional(), height:z.number().optional(), durationSeconds:z.number().optional(), founderPresent:z.boolean().default(false), faceVisible:z.boolean().default(false),
  faceFullyVisible:z.boolean().optional(), faceProminence:z.enum(['low','medium','high']).optional(), cropFlexibility:z.number().min(0).max(100).optional(),
  contextRelevance:z.number().min(0).max(100).optional(), visualProfessionalism:z.number().min(0).max(100).optional(),
  tags:z.array(z.string()).default([]), textOverlaySuitability:z.number().min(0).max(100).optional(), trustPotential:z.number().min(0).max(100).optional(),
  orientation:z.enum(['portrait','landscape','square','unknown']).default('unknown'), negativeSpace:z.enum(['low','medium','high']).optional(),
  nativeFeedFeel:z.number().min(0).max(100).optional(), segments:z.array(MediaSegmentSchema).default([])
});

export const OfferContextSchema = z.object({
  name:z.string(), url:z.string().optional(), summary:z.string(), offerType:z.string(), uniqueMechanism:z.string().optional(), proof:z.array(z.string()).default([]), claimsAllowed:z.array(z.string()).default([]), claimsProhibited:z.array(z.string()).default([])
});

export const AudienceContextSchema = z.object({
  description:z.string(), awarenessLevel:z.string().optional(), desires:z.array(z.string()).default([]), pains:z.array(z.string()).default([]), objections:z.array(z.string()).default([]), customerLanguage:z.array(z.string()).default([])
});

export const AngleSchema = z.object({ id:z.string(), name:z.string(), coreThesis:z.string(), customerTruth:z.string().optional(), desiredShift:z.string().optional() });

export const CreativeEngineInputSchema = z.object({
  requestId:z.string(), offer:OfferContextSchema, audience:AudienceContextSchema, brand:BrandSystemSchema,
  mediaAssets:z.array(MediaAssetSchema).default([]), angles:z.array(AngleSchema).default([]), requestedCreativeCount:z.number().int().min(1).max(50).default(5),
  preferredFormats:z.array(CreativeFormatSchema).default([]), excludedFormats:z.array(CreativeFormatSchema).default([]),
  formatTargets:z.partialRecord(CreativeFormatSchema,z.number().int().min(0)).optional()
});

export const CreativeRouteSchema = z.object({
  id:z.string(), angleId:z.string(), archetypeId:z.string(), format:CreativeFormatSchema, productionTreatmentId:z.string(), styleId:z.string(), conceptName:z.string(), singleBigIdea:z.string(), primaryHook:z.string(), visualSummary:z.string(), whyItFits:z.string(),
  scores:z.object({ strategicClarity:z.number().min(0).max(100), visualStopPower:z.number().min(0).max(100), relevance:z.number().min(0).max(100), specificity:z.number().min(0).max(100), glanceComprehension:z.number().min(0).max(100) })
});

export const CreativeBriefSchema = z.object({
  routeId:z.string(), headline:z.string(), supportingCopy:z.string().optional(), cta:z.string().optional(), visualConcept:z.string(), composition:z.string(), focalPoint:z.string(), mustInclude:z.array(z.string()).default([]), mustAvoid:z.array(z.string()).default([]),
  brandAdaptation:z.object({
    colors:z.array(z.string()).default([]), headlineFont:z.string().optional(), bodyFont:z.string().optional(), photoTreatment:z.string().optional(), motifs:z.array(z.string()).default([]),
    typographyRoles:z.record(z.string(),TypographyRoleSchema).optional(), textures:z.array(z.string()).optional(), patterns:z.array(z.string()).optional(),
    logoRules:z.object({ clearSpace:z.string().optional(), preferredPlacements:z.array(z.string()).optional() }).optional(),
    components:z.object({ cornerRadius:z.string().optional(), borderStyle:z.string().optional(), shadowStyle:z.string().optional(), buttonStyle:z.string().optional() }).optional(),
    layoutNotes:z.array(z.string()).optional()
  })
});

export const MediaMatchSchema = z.object({
  source:z.enum(["uploaded","generated","hybrid"]), primaryAssetId:z.string().optional(), score:z.number().min(0).max(100).optional(), suitabilityScore:z.number().min(0).max(100).optional(), reason:z.string(), backupAssetIds:z.array(z.string()).default([]), cropGuidance:z.string().optional(), cropAnchor:z.enum(['top','center','bottom']).optional(), warnings:z.array(z.string()).default([]),
  selectedSegmentIds:z.array(z.string()).default([]), preserveAuthenticity:z.boolean().default(true)
});

export const QualityResultSchema = z.object({
  qualityScore:z.number().min(0).max(100), brandFidelityScore:z.number().min(0).max(100), readabilityScore:z.number().min(0).max(100), strategicClarityScore:z.number().min(0).max(100), trustScore:z.number().min(0).max(100),
  status:z.enum(["ready","minor","auto-fix","blocked"]), criticalFailures:z.array(z.string()).default([]), warnings:z.array(z.string()).default([])
});

export const CreativeConceptSchema = z.object({ route:CreativeRouteSchema, brief:CreativeBriefSchema, mediaMatch:MediaMatchSchema, qa:QualityResultSchema, renderPlan:CompiledCreativeOutputSchema });
export const CreativeEngineOutputSchema = z.object({ requestId:z.string(), engineVersion:z.string(), concepts:z.array(CreativeConceptSchema), warnings:z.array(z.string()).default([]) });

export type CreativeEngineInput = z.infer<typeof CreativeEngineInputSchema>;
export type CreativeEngineOutput = z.infer<typeof CreativeEngineOutputSchema>;
export type CreativeRoute = z.infer<typeof CreativeRouteSchema>;
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
