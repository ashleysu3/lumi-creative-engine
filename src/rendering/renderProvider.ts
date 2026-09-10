import type { StaticRenderSpec, CarouselRenderSpec } from './compileCreativeOutput.js';

export type RenderedAsset = {
  url: string;
  width: number;
  height: number;
  mimeType: 'image/png'|'image/jpeg'|'image/webp';
};

export type SceneGenerationRequest = {
  prompt: string;
  negativePrompt: string[];
  width: number;
  height: number;
  referenceAssetUrl?: string;
};

export type RenderProvider = {
  generateScene(request: SceneGenerationRequest): Promise<RenderedAsset>;
  composeStatic(spec: StaticRenderSpec, scene?: RenderedAsset): Promise<RenderedAsset>;
  composeCarousel(spec: CarouselRenderSpec, scenes?: Array<RenderedAsset|undefined>): Promise<RenderedAsset[]>;
};

export class NoopRenderProvider implements RenderProvider {
  async generateScene(): Promise<RenderedAsset> { throw new Error('No render provider configured.'); }
  async composeStatic(): Promise<RenderedAsset> { throw new Error('No render provider configured.'); }
  async composeCarousel(): Promise<RenderedAsset[]> { throw new Error('No render provider configured.'); }
}
