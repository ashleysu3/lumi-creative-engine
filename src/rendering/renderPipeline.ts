import type { CreativeEngineInput } from '../schemas/index.js';
import type { CompiledCreativeOutput, StaticRenderSpec, CarouselRenderSpec, VideoProductionSpec } from './compileCreativeOutput.js';
import type { CompositionProvider, RenderedAsset, SceneProvider } from './renderProvider.js';
import { createCreativeVersion, type CreativeVersion } from './versioning.js';

export type AssetResolver = {
  resolve(assetId:string):Promise<RenderedAsset|undefined>;
};

function mimeFromUrl(url:string):RenderedAsset['mimeType'] {
  const normalized = url.split('?')[0].toLowerCase();
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/** Resolves uploaded assets directly from the engine input when a URL is present. */
export class InputAssetResolver implements AssetResolver {
  constructor(private readonly input:CreativeEngineInput) {}

  async resolve(assetId:string):Promise<RenderedAsset|undefined> {
    const asset = this.input.mediaAssets.find(item=>item.id===assetId);
    if (!asset?.url || !['image','screenshot','logo'].includes(asset.type)) return undefined;
    return {
      url:asset.url,
      width:asset.width ?? 1080,
      height:asset.height ?? 1350,
      mimeType:mimeFromUrl(asset.url)
    };
  }
}

export type RenderPipelineOptions = {
  sceneProvider:SceneProvider;
  compositionProvider:CompositionProvider;
  assetResolver:AssetResolver;
  /** Off by default to keep carousel image-generation costs predictable. */
  generateSupportingCarouselScenes?:boolean;
};

export type RenderedStaticResult = {
  kind:'static';
  flattenedAsset:RenderedAsset;
  sceneAsset?:RenderedAsset;
  version:CreativeVersion;
};

export type RenderedCarouselResult = {
  kind:'carousel';
  flattenedAssets:RenderedAsset[];
  sceneAssets:Array<RenderedAsset|undefined>;
  versions:CreativeVersion[];
};

export type VideoPlanResult = {
  kind:'video-plan';
  plan:VideoProductionSpec;
};

export type RenderPipelineResult = RenderedStaticResult|RenderedCarouselResult|VideoPlanResult;

async function sceneForStatic(spec:StaticRenderSpec,options:RenderPipelineOptions):Promise<RenderedAsset|undefined> {
  if (spec.primaryAssetId && spec.assetSource !== 'generated') {
    const uploaded = await options.assetResolver.resolve(spec.primaryAssetId);
    if (uploaded) return uploaded;
  }
  if (!spec.generationReady) return undefined;
  return options.sceneProvider.generateScene({
    prompt:spec.scenePrompt,
    negativePrompt:spec.negativePrompt,
    width:spec.width,
    height:spec.height
  });
}

async function renderStatic(spec:StaticRenderSpec,creativeId:string,options:RenderPipelineOptions):Promise<RenderedStaticResult> {
  const sceneAsset = await sceneForStatic(spec,options);
  const flattenedAsset = await options.compositionProvider.composeStatic(spec,sceneAsset);
  const version = createCreativeVersion({
    creativeId,
    compiled:spec,
    flattenedAssetUrl:flattenedAsset.url,
    sourceMediaIds:spec.primaryAssetId ? [spec.primaryAssetId] : [],
    layoutConfig:{ layoutVariant:spec.layoutVariant,assetSource:spec.assetSource },
    copyVersion:Object.fromEntries(spec.overlays.map(item=>[item.role,item.text])),
    brandSettingsUsed:spec.design,
    width:flattenedAsset.width,
    height:flattenedAsset.height,
    aspectRatio:spec.aspectRatio
  });
  return { kind:'static',flattenedAsset,sceneAsset,version };
}

async function renderCarousel(spec:CarouselRenderSpec,creativeId:string,options:RenderPipelineOptions):Promise<RenderedCarouselResult> {
  const scenes:Array<RenderedAsset|undefined> = [];
  let primary:RenderedAsset|undefined;
  if (spec.primaryAssetId && spec.assetSource !== 'generated') primary = await options.assetResolver.resolve(spec.primaryAssetId);

  for (let index=0; index<spec.slides.length; index++) {
    const slide = spec.slides[index];
    if (index===0 && primary) { scenes.push(primary); continue; }
    const shouldGenerate = slide.visualType !== 'type-led' && (index===0 || options.generateSupportingCarouselScenes === true);
    if (!shouldGenerate) { scenes.push(undefined); continue; }
    scenes.push(await options.sceneProvider.generateScene({
      prompt:slide.visualDescription,
      negativePrompt:[...slide.prohibitedRenderText,'No written text, labels, logos, statistics, UI copy, or poster typography inside the generated scene.'],
      width:spec.width,
      height:spec.height
    }));
  }

  const flattenedAssets = await options.compositionProvider.composeCarousel(spec,scenes);
  const versions = flattenedAssets.map((asset,index)=>createCreativeVersion({
    creativeId:`${creativeId}:slide-${index+1}`,
    compiled:spec,
    flattenedAssetUrl:asset.url,
    sourceMediaIds:index===0 && spec.primaryAssetId ? [spec.primaryAssetId] : [],
    layoutConfig:{ slideNumber:index+1,layoutType:spec.slides[index]?.layoutType,assetSource:spec.assetSource },
    copyVersion:{
      headline:spec.slides[index]?.headline,
      support:spec.slides[index]?.subhead ?? spec.slides[index]?.body,
      cta:spec.slides[index]?.cta
    },
    brandSettingsUsed:spec.design,
    width:asset.width,
    height:asset.height,
    aspectRatio:spec.aspectRatio
  }));
  return { kind:'carousel',flattenedAssets,sceneAssets:scenes,versions };
}

/** Converts a compiled strategy output into either a finished static/carousel asset or a production-ready video plan. */
export async function renderCompiledCreative(
  compiled:CompiledCreativeOutput,
  creativeId:string,
  options:RenderPipelineOptions
):Promise<RenderPipelineResult> {
  if (compiled.kind==='static') return renderStatic(compiled,creativeId,options);
  if (compiled.kind==='carousel') return renderCarousel(compiled,creativeId,options);
  return { kind:'video-plan',plan:compiled };
}
