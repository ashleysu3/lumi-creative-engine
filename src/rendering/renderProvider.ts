import type { StaticRenderSpec, CarouselRenderSpec } from './compileCreativeOutput.js';

export type RenderedAsset = {
  url: string;
  width: number;
  height: number;
  mimeType: 'image/png'|'image/jpeg'|'image/webp'|'image/svg+xml';
};

export type SceneGenerationRequest = {
  prompt: string;
  negativePrompt: string[];
  width: number;
  height: number;
  referenceAssetUrl?: string;
};

/** Scene generation is intentionally separate from deterministic composition. */
export type SceneProvider = {
  generateScene(request: SceneGenerationRequest): Promise<RenderedAsset>;
};

export type CompositionProvider = {
  composeStatic(spec: StaticRenderSpec, scene?: RenderedAsset): Promise<RenderedAsset>;
  composeCarousel(spec: CarouselRenderSpec, scenes?: Array<RenderedAsset|undefined>): Promise<RenderedAsset[]>;
};

export type RenderProvider = SceneProvider & CompositionProvider;

export class NoopSceneProvider implements SceneProvider {
  async generateScene(): Promise<RenderedAsset> { throw new Error('No scene provider configured.'); }
}

export class NoopCompositionProvider implements CompositionProvider {
  async composeStatic(): Promise<RenderedAsset> { throw new Error('No composition provider configured.'); }
  async composeCarousel(): Promise<RenderedAsset[]> { throw new Error('No composition provider configured.'); }
}

export class NoopRenderProvider implements RenderProvider {
  async generateScene(): Promise<RenderedAsset> { throw new Error('No render provider configured.'); }
  async composeStatic(): Promise<RenderedAsset> { throw new Error('No render provider configured.'); }
  async composeCarousel(): Promise<RenderedAsset[]> { throw new Error('No render provider configured.'); }
}
