import { z } from 'zod';
import { CreativeEngineInputSchema } from '../schemas/index.js';
import { CompiledCreativeOutputSchema } from '../rendering/renderSchemas.js';
import { InputAssetResolver, renderCompiledCreative } from '../rendering/renderPipeline.js';
import { NoopSceneProvider, type CompositionProvider, type RenderedAsset, type SceneGenerationRequest, type SceneProvider } from '../rendering/renderProvider.js';
import { SvgCompositionProvider } from '../rendering/svgCompositionProvider.js';
import type { HttpResponse } from './http.js';

export const RenderCreativeRequestSchema = z.object({
  creativeId:z.string().min(1),
  input:CreativeEngineInputSchema,
  renderPlan:CompiledCreativeOutputSchema,
  options:z.object({
    generateSupportingCarouselScenes:z.boolean().optional(),
    /** Creative Lab only: render the layout with a neutral placeholder when image generation is unavailable. */
    allowPlaceholderScene:z.boolean().optional()
  }).optional()
});

export type RenderHttpOptions = {
  sceneProvider?:SceneProvider;
  compositionProvider?:CompositionProvider;
};

function needsGeneratedScene(plan:z.infer<typeof CompiledCreativeOutputSchema>):boolean {
  if (plan.kind==='video') return false;
  if (plan.kind==='static') return plan.assetSource==='generated' || !plan.primaryAssetId;
  return plan.slides.some((slide,index)=>slide.visualType!=='type-led' && index===0) && (plan.assetSource==='generated' || !plan.primaryAssetId);
}

function svgDataUrl(svg:string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * A deliberately neutral, text-free scene used only by the standalone Creative Lab.
 * It lets us evaluate composition without pretending that a generated scene exists.
 */
class PreviewPlaceholderSceneProvider implements SceneProvider {
  async generateScene(request:SceneGenerationRequest):Promise<RenderedAsset> {
    const { width,height } = request;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4efe8"/>
          <stop offset="1" stop-color="#e8dfd5"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <circle cx="${Math.round(width*0.78)}" cy="${Math.round(height*0.22)}" r="${Math.round(width*0.22)}" fill="#ffffff" opacity="0.48"/>
      <rect x="${Math.round(width*0.08)}" y="${Math.round(height*0.17)}" width="${Math.round(width*0.44)}" height="${Math.round(height*0.56)}" rx="${Math.round(width*0.04)}" fill="#ffffff" opacity="0.46"/>
      <path d="M ${Math.round(width*0.1)} ${Math.round(height*0.82)} C ${Math.round(width*0.35)} ${Math.round(height*0.72)}, ${Math.round(width*0.65)} ${Math.round(height*0.92)}, ${Math.round(width*0.92)} ${Math.round(height*0.76)}" fill="none" stroke="#d977a8" stroke-width="${Math.max(4,Math.round(width*0.008))}" stroke-linecap="round" opacity="0.65"/>
    </svg>`;
    return { url:svgDataUrl(svg),width,height,mimeType:'image/svg+xml' };
  }
}

export async function handleRenderCreative(requestBody:unknown,options:RenderHttpOptions={}):Promise<HttpResponse> {
  const parsed = RenderCreativeRequestSchema.safeParse(requestBody);
  if (!parsed.success) {
    return { status:400,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'invalid_render_input',issues:parsed.error.issues}) };
  }

  const { creativeId,input,renderPlan } = parsed.data;
  const requiresGeneratedScene = needsGeneratedScene(renderPlan);
  const allowPlaceholder = parsed.data.options?.allowPlaceholderScene === true;
  const previewOnly = requiresGeneratedScene && !options.sceneProvider && allowPlaceholder;

  if (requiresGeneratedScene && !options.sceneProvider && !allowPlaceholder) {
    return {
      status:503,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:false,
        error:'image_provider_not_configured',
        message:'Scene generation is not configured. Add an image provider or request a layout-only preview.'
      })
    };
  }

  try {
    const sceneProvider = options.sceneProvider
      ?? (previewOnly ? new PreviewPlaceholderSceneProvider() : new NoopSceneProvider());
    const result = await renderCompiledCreative(renderPlan,creativeId,{
      sceneProvider,
      compositionProvider:options.compositionProvider ?? new SvgCompositionProvider(),
      assetResolver:new InputAssetResolver(input),
      generateSupportingCarouselScenes:parsed.data.options?.generateSupportingCarouselScenes
    });
    return {
      status:200,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        ok:true,
        data:result,
        previewOnly,
        warning:previewOnly ? 'Layout preview only. The real generated scene is unavailable until an image provider is configured.' : undefined
      })
    };
  } catch (error) {
    return { status:500,headers:{'content-type':'application/json'},body:JSON.stringify({ok:false,error:'render_failed',message:error instanceof Error?error.message:'Unknown error'}) };
  }
}
