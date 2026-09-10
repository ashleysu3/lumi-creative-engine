import { expect, it } from 'vitest';
import { SvgCompositionProvider } from '../src/rendering/svgCompositionProvider.js';
import { InputAssetResolver, renderCompiledCreative } from '../src/rendering/renderPipeline.js';
import type { SceneProvider } from '../src/rendering/renderProvider.js';
import type { CreativeEngineInput } from '../src/schemas/index.js';

const input:CreativeEngineInput = {
  requestId:'render-test',
  offer:{name:'Offer',summary:'A clear offer.',offerType:'service',proof:[],claimsAllowed:[],claimsProhibited:[]},
  audience:{description:'Owners',desires:[],pains:[],objections:[],customerLanguage:[]},
  brand:{
    colors:{primary:['#111111'],secondary:['#f2eee8'],accent:['#dd7799'],background:['#ffffff'],prohibited:[]},
    typography:{headlineFamily:'Fraunces',bodyFamily:'Poppins',allowedWeights:[],notes:[]},
    photography:{founderLed:true,styleNotes:[],avoid:[]},logoAssetIds:[],motifs:[],avoid:[]
  },
  mediaAssets:[{id:'founder',type:'image',url:'https://example.com/founder.jpg',width:1200,height:1600,founderPresent:true,faceVisible:true,tags:[],orientation:'portrait',segments:[]}],
  angles:[],requestedCreativeCount:1,preferredFormats:[],excludedFormats:[]
};

const sceneProvider:SceneProvider = {
  async generateScene(request){
    return {url:'data:image/png;base64,YWJj',width:1024,height:1536,mimeType:'image/png'};
  }
};

it('composes uploaded founder media without regenerating it', async () => {
  let generations = 0;
  const trackingScene:SceneProvider = { async generateScene(){ generations++; return sceneProvider.generateScene({prompt:'',negativePrompt:[],width:1080,height:1350}); } };
  const result = await renderCompiledCreative({
    kind:'static',mode:'scene-only',aspectRatio:'4:5',width:1080,height:1350,
    scenePrompt:'Founder at desk',negativePrompt:['No text'],primaryAssetId:'founder',assetSource:'uploaded',layoutVariant:'editorial-overlay',
    design:{colors:['#ffffff','#111111','#dd7799','#f2eee8'],headlineFont:'Fraunces',bodyFont:'Poppins',motifs:[]},
    overlays:[{role:'headline',text:'A real headline',placement:'primary',maxLines:3}],layoutRules:[],generationReady:true
  },'creative-1',{
    sceneProvider:trackingScene,compositionProvider:new SvgCompositionProvider(),assetResolver:new InputAssetResolver(input)
  });

  expect(result.kind).toBe('static');
  if(result.kind!=='static') return;
  expect(generations).toBe(0);
  expect(result.sceneAsset?.url).toBe('https://example.com/founder.jpg');
  expect(result.flattenedAsset.mimeType).toBe('image/svg+xml');
  expect(result.flattenedAsset.url).toContain('data:image/svg+xml');
  expect(result.version.sourceMediaIds).toEqual(['founder']);
});

it('generates only the scene when no uploaded media is selected', async () => {
  let generations = 0;
  const trackingScene:SceneProvider = { async generateScene(){ generations++; return {url:'data:image/png;base64,YWJj',width:1024,height:1536,mimeType:'image/png'}; } };
  const result = await renderCompiledCreative({
    kind:'static',mode:'scene-only',aspectRatio:'4:5',width:1080,height:1350,
    scenePrompt:'Specific product scene',negativePrompt:['No text'],assetSource:'generated',layoutVariant:'split-card',
    design:{colors:['#ffffff','#111111','#dd7799','#f2eee8'],motifs:[]},
    overlays:[{role:'headline',text:'The headline stays deterministic',placement:'primary'}],layoutRules:[],generationReady:true
  },'creative-2',{
    sceneProvider:trackingScene,compositionProvider:new SvgCompositionProvider(),assetResolver:new InputAssetResolver(input)
  });
  expect(generations).toBe(1);
  expect(result.kind).toBe('static');
});

it('keeps carousel production labels out of the composed SVG', async () => {
  const result = await renderCompiledCreative({
    kind:'carousel',aspectRatio:'4:5',width:1080,height:1350,assetSource:'generated',design:{colors:['#ffffff','#111111','#dd7799','#f2eee8'],motifs:[]},
    slides:[
      {slideNumber:1,role:'hook',headline:'Stop guessing what ad to make.',visualType:'type-led',visualDescription:'Type led',layoutType:'hero-hook',prohibitedRenderText:['CARD 1','HOOK','HEADLINE:']},
      {slideNumber:2,role:'shift',headline:'Start with the offer.',visualType:'type-led',visualDescription:'Type led',layoutType:'statement',prohibitedRenderText:['CARD 2','HOOK']}
    ],continuityRules:[],generationReady:true
  },'carousel-1',{
    sceneProvider,compositionProvider:new SvgCompositionProvider(),assetResolver:new InputAssetResolver(input)
  });
  expect(result.kind).toBe('carousel');
  if(result.kind!=='carousel') return;
  const decoded = decodeURIComponent(result.flattenedAssets[0].url.split(',')[1]);
  expect(decoded).toContain('Stop guessing what ad');
  expect(decoded).toContain('to make.');
  expect(decoded).not.toContain('CARD 1');
  expect(decoded).not.toContain('HEADLINE:');
});
