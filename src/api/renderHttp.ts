import { z } from 'zod';
import { CreativeEngineInputSchema } from '../schemas/index.js';
import { CompiledCreativeOutputSchema } from '../rendering/renderSchemas.js';
import { InputAssetResolver, renderCompiledCreative } from '../rendering/renderPipeline.js';
import { NoopSceneProvider, type CompositionProvider, type SceneProvider } from '../rendering/renderProvider.js';
import { SvgCompositionProvider } from '../rendering/svgCompositionProvider.js';
import type { HttpResponse } from './http.js';

export const RenderCreativeRequestSchema = z.object({
  creativeId:z.string().min(1),
  input:CreativeEngineInputSchema,
  renderPlan:CompiledCreativeOutputSchema,
  options:z.object({ generateSupportingCarouselScenes:z.boolean().optional() }).optional()
});

export type RenderHttpOptions = {
  sceneProvider?:SceneProvider;
  compositionProvider?:CompositionProvider;
};

function needsGeneratedScene(plan:z.infer<typeof CompiledCreativeOutputSchema>):boolean {
  if (plan.kind==='video') return false;
  if (plan.kind==='static') return plan.assetSource==='generated' || !plan.primaryAssetId;
  return plan.slides.some((slide,index)=>slide.visualType!=='type-led' && (index===0 || false)) && (plan.assetSource==='generated' || !plan.primaryAssetId);
}

export async function handleRenderCreative(requestBody:unknown,options:RenderHttpOptions={}):Promise<HttpResponse> {
  const parsed = RenderCreativeRequestSchema.safeParse(requestBody);
  if (!parsed.success) {
    return { status:400,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'invalid_render_input',issues:parsed.error.issues}) };
  }

  const { creativeId,input,renderPlan } = parsed.data;
  if (needsGeneratedScene(renderPlan) && !options.sceneProvider) {
    return { status:503,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'image_provider_not_configured'}) };
  }

  try {
    const result = await renderCompiledCreative(renderPlan,creativeId,{
      sceneProvider:options.sceneProvider ?? new NoopSceneProvider(),
      compositionProvider:options.compositionProvider ?? new SvgCompositionProvider(),
      assetResolver:new InputAssetResolver(input),
      generateSupportingCarouselScenes:parsed.data.options?.generateSupportingCarouselScenes
    });
    return { status:200,headers:{'content-type':'application/json'},body:JSON.stringify({ok:true,data:result}) };
  } catch (error) {
    return { status:500,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'render_failed',message:error instanceof Error?error.message:'Unknown error'}) };
  }
}
