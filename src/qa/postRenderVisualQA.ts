import { z } from 'zod';

export const VisualIssueSchema = z.object({
  code: z.enum([
    'cropped-face','cropped-limb','cropped-product','cropped-ui','subject-edge',
    'text-over-subject','logo-collision','cta-collision','text-overlap','low-contrast',
    'visual-imbalance','excess-empty-space','awkward-crop','small-text','generated-artifact'
  ]),
  severity: z.enum(['warning','critical']),
  message: z.string(),
  recommendedFix: z.string(),
  autoFixable: z.boolean()
});

export const PostRenderVisualQAResultSchema = z.object({
  visualQaScore: z.number().min(0).max(100),
  status: z.enum(['ready','minor','auto-fix','blocked']),
  issues: z.array(VisualIssueSchema).default([]),
  criticalFailures: z.array(z.string()).default([]),
  recommendedFixes: z.array(z.string()).default([]),
  autoFixable: z.boolean(),
  attempts: z.number().int().min(0).default(0)
});

export type PostRenderVisualQAResult = z.infer<typeof PostRenderVisualQAResultSchema>;

export type VisualQAInput = {
  flattenedAssetUrl: string;
  width: number;
  height: number;
  knownRegions?: {
    headline?: { x:number; y:number; width:number; height:number };
    support?: { x:number; y:number; width:number; height:number };
    cta?: { x:number; y:number; width:number; height:number };
    logo?: { x:number; y:number; width:number; height:number };
  };
};

/**
 * Provider-agnostic visual QA contract. The app or worker supplies a vision
 * implementation and receives a normalized result the rest of LUMI can trust.
 */
export async function runPostRenderVisualQA(
  input: VisualQAInput,
  inspect: (input: VisualQAInput) => Promise<PostRenderVisualQAResult>
): Promise<PostRenderVisualQAResult> {
  const result = PostRenderVisualQAResultSchema.parse(await inspect(input));
  if (result.criticalFailures.length > 0 && result.status !== 'blocked') {
    return { ...result, status: 'blocked', autoFixable: result.issues.filter(i => i.severity === 'critical').every(i => i.autoFixable) };
  }
  return result;
}
