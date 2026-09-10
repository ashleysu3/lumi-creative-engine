import { describe, expect, it } from 'vitest';
import { handleRenderCreative } from '../src/api/renderHttp.js';

const input = {
  requestId:'preview-test',
  offer:{name:'Lumi',summary:'Meta ad creative software.',offerType:'SaaS software',proof:[],claimsAllowed:[],claimsProhibited:[]},
  audience:{description:'Meta advertisers',desires:[],pains:[],objections:[],customerLanguage:[]},
  brand:{
    colors:{primary:['#111111'],secondary:['#f2eee8'],accent:['#d977a8'],background:['#ffffff'],prohibited:[]},
    typography:{headlineFamily:'Georgia',bodyFamily:'Inter',allowedWeights:[400,700],notes:[]},
    photography:{founderLed:false,styleNotes:[],avoid:[]},
    logoAssetIds:[],motifs:[],avoid:[]
  },
  mediaAssets:[],angles:[],requestedCreativeCount:1,preferredFormats:[],excludedFormats:[]
};

const generatedStatic = {
  kind:'static' as const,
  mode:'scene-only' as const,
  aspectRatio:'4:5' as const,
  width:1080,
  height:1350,
  scenePrompt:'An abstract editorial work surface.',
  negativePrompt:['No text'],
  assetSource:'generated' as const,
  cropAnchor:'center' as const,
  layoutVariant:'split-card' as const,
  design:{colors:['#ffffff','#111111','#d977a8','#f2eee8'],headlineFont:'Georgia',bodyFont:'Inter',motifs:[]},
  overlays:[{role:'headline' as const,text:'Know what ad to make next.',placement:'primary',maxLines:4}],
  layoutRules:[],
  generationReady:true
};

describe('Creative Lab render fallback',()=>{
  it('preserves production behavior when no image provider is configured',async()=>{
    const response = await handleRenderCreative({creativeId:'c1',input,renderPlan:generatedStatic});
    expect(response.status).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('image_provider_not_configured');
  });

  it('can render a clearly marked layout-only preview for the Lab',async()=>{
    const response = await handleRenderCreative({
      creativeId:'c2',
      input,
      renderPlan:generatedStatic,
      options:{allowPlaceholderScene:true}
    });
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.previewOnly).toBe(true);
    expect(body.warning).toMatch(/layout preview only/i);
    expect(body.data.kind).toBe('static');
    expect(body.data.flattenedAsset.width).toBe(1080);
    expect(body.data.flattenedAsset.height).toBe(1350);
  });
});
