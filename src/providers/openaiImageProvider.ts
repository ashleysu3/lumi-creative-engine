import type { RenderedAsset, SceneGenerationRequest, SceneProvider } from '../rendering/renderProvider.js';

type OpenAIImageQuality = 'low'|'medium'|'high'|'xhigh'|'max'|'auto';
type OpenAIImageFormat = 'png'|'webp'|'jpeg';

type OpenAIImageProviderOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  quality?: OpenAIImageQuality;
  outputFormat?: OpenAIImageFormat;
};

type ImagesResponse = {
  data?: Array<{ b64_json?: string }>;
  output_format?: OpenAIImageFormat;
  error?: { message?: string } | null;
};

function chooseApiSize(width:number,height:number):'1024x1024'|'1024x1536'|'1536x1024' {
  const ratio = width / Math.max(1,height);
  if (ratio < 0.9) return '1024x1536';
  if (ratio > 1.1) return '1536x1024';
  return '1024x1024';
}

function dimensionsForSize(size:'1024x1024'|'1024x1536'|'1536x1024') {
  if (size === '1024x1536') return { width:1024,height:1536 };
  if (size === '1536x1024') return { width:1536,height:1024 };
  return { width:1024,height:1024 };
}

function mimeForFormat(format:OpenAIImageFormat):RenderedAsset['mimeType'] {
  if (format === 'webp') return 'image/webp';
  if (format === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

function buildScenePrompt(request:SceneGenerationRequest):string {
  const negative = request.negativePrompt.filter(Boolean);
  return [
    request.prompt.trim(),
    'Create only the photographic or illustrative scene/background for a Meta ad. Do not design a finished advertisement.',
    'Leave intentional negative space for deterministic headline and CTA overlays when the composition calls for it.',
    'Protect faces, hands, products, and important interface details from edge crops.',
    negative.length ? `Strict exclusions: ${negative.join(' ')}` : ''
  ].filter(Boolean).join('\n\n');
}

/**
 * Generates scene-only imagery through OpenAI Images. It deliberately does not
 * compose ad copy or logos; those remain deterministic renderer responsibilities.
 */
export class OpenAIImageProvider implements SceneProvider {
  private readonly apiKey:string;
  private readonly model:string;
  private readonly baseUrl:string;
  private readonly fetchFn:typeof fetch;
  private readonly quality:OpenAIImageQuality;
  private readonly outputFormat:OpenAIImageFormat;

  constructor(options:OpenAIImageProviderOptions) {
    if (!options.apiKey) throw new Error('OpenAIImageProvider requires an API key.');
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'gpt-image-2.5-flare';
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/,'');
    this.fetchFn = options.fetchFn ?? fetch;
    this.quality = options.quality ?? 'high';
    this.outputFormat = options.outputFormat ?? 'png';
  }

  async generateScene(request:SceneGenerationRequest):Promise<RenderedAsset> {
    if (request.referenceAssetUrl) {
      throw new Error('Reference-image editing is not enabled in OpenAIImageProvider yet; pass uploaded media directly to the compositor instead.');
    }

    const size = chooseApiSize(request.width,request.height);
    const response = await this.fetchFn(`${this.baseUrl}/images/generations`,{
      method:'POST',
      headers:{ authorization:`Bearer ${this.apiKey}`,'content-type':'application/json' },
      body:JSON.stringify({
        model:this.model,
        prompt:buildScenePrompt(request),
        n:1,
        size,
        quality:this.quality,
        output_format:this.outputFormat,
        background:'opaque'
      })
    });

    const body = await response.json() as ImagesResponse;
    if (!response.ok) throw new Error(body.error?.message ?? `OpenAI image request failed with status ${response.status}.`);
    const base64 = body.data?.[0]?.b64_json;
    if (!base64) throw new Error('OpenAI image generation returned no image data.');
    const format = body.output_format ?? this.outputFormat;
    const dimensions = dimensionsForSize(size);
    return {
      url:`data:${mimeForFormat(format)};base64,${base64}`,
      width:dimensions.width,
      height:dimensions.height,
      mimeType:mimeForFormat(format)
    };
  }
}

export type { OpenAIImageProviderOptions, OpenAIImageQuality, OpenAIImageFormat };
