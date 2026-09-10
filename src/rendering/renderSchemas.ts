import { z } from 'zod';

export const TextOverlaySchema = z.object({
  role:z.enum(['eyebrow','headline','support','body','cta','microcopy']),
  text:z.string(),
  placement:z.string(),
  maxLines:z.number().int().positive().optional()
});

export const RenderTypographyRoleSchema = z.object({
  family:z.string().optional(),
  weight:z.number().int().min(100).max(1000).optional(),
  textTransform:z.enum(['none','uppercase','lowercase','capitalize']).optional(),
  tracking:z.number().optional(),
  lineHeight:z.number().positive().optional(),
  italic:z.boolean().optional()
});

export const RenderDesignTokensSchema = z.object({
  colors:z.array(z.string()).default([]),
  headlineFont:z.string().optional(),
  bodyFont:z.string().optional(),
  photoTreatment:z.string().optional(),
  motifs:z.array(z.string()).default([]),
  typographyRoles:z.record(z.string(),RenderTypographyRoleSchema).optional(),
  textures:z.array(z.string()).optional(),
  patterns:z.array(z.string()).optional(),
  logoRules:z.object({ clearSpace:z.string().optional(), preferredPlacements:z.array(z.string()).optional() }).optional(),
  components:z.object({ cornerRadius:z.string().optional(), borderStyle:z.string().optional(), shadowStyle:z.string().optional(), buttonStyle:z.string().optional() }).optional(),
  layoutNotes:z.array(z.string()).optional()
});

export const StaticLayoutVariantSchema = z.enum(['split-card','editorial-overlay','native-caption','app-native','screenshot-frame','statement-card','comparison-split']);

export const ComparisonContentSchema = z.object({
  leftLabel:z.string(),
  leftText:z.string(),
  rightLabel:z.string(),
  rightText:z.string()
});

export const StaticRenderSpecSchema = z.object({
  kind:z.literal('static'),
  mode:z.enum(['scene-only','fully-designed']),
  aspectRatio:z.literal('4:5'),
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  scenePrompt:z.string(),
  negativePrompt:z.array(z.string()).default([]),
  primaryAssetId:z.string().optional(),
  assetSource:z.enum(['uploaded','generated','hybrid']),
  cropAnchor:z.enum(['top','center','bottom']).default('center'),
  layoutVariant:StaticLayoutVariantSchema,
  comparison:ComparisonContentSchema.optional(),
  annotations:z.array(z.string()).default([]),
  design:RenderDesignTokensSchema,
  overlays:z.array(TextOverlaySchema),
  layoutRules:z.array(z.string()).default([]),
  generationReady:z.boolean()
});

export const CarouselSlideSchema = z.object({
  slideNumber:z.number().int().positive(),
  role:z.enum(['hook','problem','correction','proof','example','shift','cta']),
  headline:z.string(),
  subhead:z.string().optional(),
  body:z.string().optional(),
  microcopy:z.string().optional(),
  cta:z.string().optional(),
  visualType:z.enum(['photo','graphic','screenshot','type-led','hybrid']),
  visualDescription:z.string(),
  layoutType:z.string(),
  prohibitedRenderText:z.array(z.string()).default([])
});

export const CarouselRenderSpecSchema = z.object({
  kind:z.literal('carousel'),
  aspectRatio:z.literal('4:5'),
  width:z.number().int().positive(),
  height:z.number().int().positive(),
  primaryAssetId:z.string().optional(),
  assetSource:z.enum(['uploaded','generated','hybrid']),
  cropAnchor:z.enum(['top','center','bottom']).default('center'),
  design:RenderDesignTokensSchema,
  slides:z.array(CarouselSlideSchema).min(1),
  continuityRules:z.array(z.string()).default([]),
  generationReady:z.boolean()
});

export const VideoBeatSchema = z.object({
  start:z.number().min(0),
  end:z.number().positive(),
  purpose:z.string(),
  visual:z.string(),
  onScreenText:z.string().optional(),
  voiceover:z.string().optional(),
  transition:z.string().optional()
});

export const VideoProductionSpecSchema = z.object({
  kind:z.literal('video'),
  format:z.string(),
  hook:z.string(),
  durationSeconds:z.number().positive(),
  primaryAssetId:z.string().optional(),
  selectedSegmentIds:z.array(z.string()).default([]),
  beats:z.array(VideoBeatSchema),
  filmingNotes:z.array(z.string()).default([]),
  generationReady:z.boolean()
});

export const CompiledCreativeOutputSchema = z.discriminatedUnion('kind',[
  StaticRenderSpecSchema,
  CarouselRenderSpecSchema,
  VideoProductionSpecSchema
]);

export type TextOverlay = z.infer<typeof TextOverlaySchema>;
export type RenderTypographyRole = z.infer<typeof RenderTypographyRoleSchema>;
export type RenderDesignTokens = z.infer<typeof RenderDesignTokensSchema>;
export type StaticLayoutVariant = z.infer<typeof StaticLayoutVariantSchema>;
export type ComparisonContent = z.infer<typeof ComparisonContentSchema>;
export type StaticRenderSpec = z.infer<typeof StaticRenderSpecSchema>;
export type CarouselSlide = z.infer<typeof CarouselSlideSchema>;
export type CarouselRenderSpec = z.infer<typeof CarouselRenderSpecSchema>;
export type VideoProductionSpec = z.infer<typeof VideoProductionSpecSchema>;
export type CompiledCreativeOutput = z.infer<typeof CompiledCreativeOutputSchema>;
