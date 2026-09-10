import { z } from 'zod';
import { BrandSystemSchema, CreativeFormatSchema, MediaAssetSchema } from '../schemas/index.js';

export const ProofItemSchema = z.object({
  id:z.string(),
  type:z.enum(['testimonial','metric','credential','case-study','press','product-proof','other']),
  text:z.string(),
  source:z.string().optional(),
  verified:z.boolean().default(false),
  approvedForAds:z.boolean().default(false),
  notes:z.string().optional()
});

export const AudienceProfileSchema = z.object({
  id:z.string(),
  name:z.string(),
  description:z.string(),
  awarenessLevel:z.string().optional(),
  desires:z.array(z.string()).default([]),
  pains:z.array(z.string()).default([]),
  objections:z.array(z.string()).default([]),
  customerLanguage:z.array(z.string()).default([]),
  identitySignals:z.array(z.string()).default([]),
  buyingTriggers:z.array(z.string()).default([]),
  anxieties:z.array(z.string()).default([])
});

export const OfferProfileSchema = z.object({
  id:z.string(),
  name:z.string(),
  url:z.string().optional(),
  offerType:z.string(),
  summary:z.string(),
  price:z.string().optional(),
  primaryPromise:z.string().optional(),
  uniqueMechanism:z.string().optional(),
  deliverables:z.array(z.string()).default([]),
  differentiators:z.array(z.string()).default([]),
  objections:z.array(z.string()).default([]),
  proofItemIds:z.array(z.string()).default([]),
  claimsAllowed:z.array(z.string()).default([]),
  claimsProhibited:z.array(z.string()).default([])
});

export const CreativeLearningSchema = z.object({
  winningAngles:z.array(z.string()).default([]),
  losingAngles:z.array(z.string()).default([]),
  winningHooks:z.array(z.string()).default([]),
  fatiguedHooks:z.array(z.string()).default([]),
  winningFormats:z.array(z.string()).default([]),
  weakFormats:z.array(z.string()).default([]),
  founderNotes:z.array(z.string()).default([]),
  visualNotes:z.array(z.string()).default([]),
  audienceLearnings:z.array(z.string()).default([]),
  performanceNotes:z.array(z.string()).default([])
});

export const ClientCreativeProfileSchema = z.object({
  id:z.string(),
  clientName:z.string(),
  website:z.string().optional(),
  industry:z.string().optional(),
  businessSummary:z.string().default(''),
  brandVoice:z.object({
    traits:z.array(z.string()).default([]),
    phrasesToUse:z.array(z.string()).default([]),
    phrasesToAvoid:z.array(z.string()).default([]),
    writingNotes:z.array(z.string()).default([])
  }),
  brand:BrandSystemSchema,
  audiences:z.array(AudienceProfileSchema).default([]),
  offers:z.array(OfferProfileSchema).default([]),
  proofLibrary:z.array(ProofItemSchema).default([]),
  competitors:z.array(z.object({ name:z.string(),url:z.string().optional(),notes:z.string().optional() })).default([]),
  creativeLearning:CreativeLearningSchema.default({}),
  globalConstraints:z.array(z.string()).default([]),
  mediaAssets:z.array(MediaAssetSchema).default([]),
  sourceNotes:z.array(z.string()).default([]),
  updatedAt:z.string().optional()
});

export const CampaignBriefSchema = z.object({
  id:z.string(),
  name:z.string(),
  offerId:z.string(),
  audienceId:z.string(),
  objective:z.enum(['sales','leads','book-calls','traffic','awareness','retargeting','other']).default('sales'),
  audienceTemperature:z.enum(['cold','warm','hot','mixed']).default('cold'),
  destinationUrl:z.string().optional(),
  promotion:z.string().optional(),
  keyMessage:z.string().optional(),
  campaignNotes:z.array(z.string()).default([]),
  desiredCreativeCount:z.number().int().min(1).max(50).default(12),
  preferredFormats:z.array(CreativeFormatSchema).default([]),
  excludedFormats:z.array(CreativeFormatSchema).default([]),
  deliveryMix:z.object({
    staticAds:z.number().int().min(0).default(4),
    brollAds:z.number().int().min(0).default(3),
    talkingHeadScripts:z.number().int().min(0).default(3),
    carousels:z.number().int().min(0).default(2)
  }).default({}),
  newProof:z.array(z.string()).default([]),
  creativeDirectionNotes:z.array(z.string()).default([])
});

export type ClientCreativeProfile = z.infer<typeof ClientCreativeProfileSchema>;
export type CampaignBrief = z.infer<typeof CampaignBriefSchema>;
export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;
export type OfferProfile = z.infer<typeof OfferProfileSchema>;
export type ProofItem = z.infer<typeof ProofItemSchema>;
