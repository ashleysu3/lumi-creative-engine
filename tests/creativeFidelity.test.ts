import { describe, expect, it } from 'vitest';
import { buildCreativeMix } from '../src/strategy/buildCreativeMix.js';
import { generateRoutes } from '../src/strategy/generateRoutes.js';
import { matchMedia } from '../src/briefs/matchMedia.js';
import { compileCreativeOutput } from '../src/rendering/compileCreativeOutput.js';
import { SvgCompositionProvider } from '../src/rendering/svgCompositionProvider.js';
import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../src/schemas/index.js';

const brand = {
  colors:{primary:['#111111'],secondary:['#f2eee8'],accent:['#d977a8'],background:['#ffffff'],prohibited:[]},
  typography:{headlineFamily:'Georgia',bodyFamily:'Inter',allowedWeights:[400,700],notes:[]},
  photography:{founderLed:true,styleNotes:['editorial'],avoid:[]},
  logoAssetIds:[],motifs:[],avoid:[]
};

function input(overrides:Partial<CreativeEngineInput> = {}):CreativeEngineInput {
  return {
    requestId:'fidelity',
    offer:{name:'Lumi',summary:'SaaS software that turns an offer into strategic Meta ad creative.',offerType:'SaaS software',proof:[],claimsAllowed:[],claimsProhibited:[]},
    audience:{description:'Meta advertisers',desires:['clear creative direction'],pains:['generic ideas'],objections:[],customerLanguage:['What ad should I make?']},
    brand,
    mediaAssets:[],
    angles:[{id:'a1',name:'Blank Page Problem',coreThesis:'The hard part is not making an ad. It is knowing what the ad should actually say and show.',customerTruth:'You do not need 100 random hooks. You need the right strategic directions.'}],
    requestedCreativeCount:8,preferredFormats:[],excludedFormats:[],
    ...overrides
  };
}

const comparisonBrief:CreativeBrief = {
  routeId:'r',headline:'Stop collecting random hooks.',supportingCopy:'You do not need 100 random hooks. You need the right strategic directions.',cta:'See how',visualConcept:'Comparison',composition:'Split',focalPoint:'Comparison',mustInclude:[],mustAvoid:[],
  brandAdaptation:{colors:['#ffffff','#111111','#d977a8','#f2eee8'],headlineFont:'Georgia',bodyFont:'Inter',motifs:[]}
};

function comparisonRoute(format:'designed-static'|'carousel'='designed-static'):CreativeRoute {
  return {
    id:'r',angleId:'a1',archetypeId:'old-way-new-way',format,productionTreatmentId:'editorial-still',styleId:'direct-response',
    conceptName:'Old vs new',singleBigIdea:'Strategy should lead the creative.',primaryHook:'Old way vs. better way',visualSummary:'comparison',whyItFits:'fit',
    scores:{strategicClarity:90,visualStopPower:90,relevance:90,specificity:90,glanceComprehension:90}
  };
}

describe('format fidelity',()=>{
  it('does not choose annotated-screenshot when no real screenshot exists',()=>{
    const mix = buildCreativeMix(input({mediaAssets:[{id:'founder',type:'image',founderPresent:true,faceVisible:true,tags:['founder'],orientation:'portrait',segments:[]}]}));
    expect(mix.map(slot=>slot.format)).not.toContain('annotated-screenshot');
  });

  it('pairs annotated-screenshot with screenshot-compatible archetypes',()=>{
    const routes = generateRoutes(input({mediaAssets:[{id:'screen',type:'screenshot',founderPresent:false,faceVisible:false,tags:['product','ui','dashboard'],orientation:'portrait',segments:[]}]}));
    const screenshotRoutes = routes.filter(route=>route.format==='annotated-screenshot');
    expect(screenshotRoutes.length).toBeGreaterThan(0);
    const allowed = new Set(['annotated-screenshot','how-it-works','feature-to-benefit','proof-first','result-dashboard']);
    expect(screenshotRoutes.every(route=>allowed.has(route.archetypeId))).toBe(true);
  });

  it('compiles comparison archetypes into an actual comparison layout',()=>{
    const plan = compileCreativeOutput(comparisonRoute(),comparisonBrief,{source:'generated',reason:'none',backupAssetIds:[],warnings:[],selectedSegmentIds:[],preserveAuthenticity:true});
    expect(plan.kind).toBe('static');
    if(plan.kind!=='static') return;
    expect(plan.layoutVariant).toBe('comparison-split');
    expect(plan.comparison?.leftText).toBe('100 random hooks');
    expect(plan.comparison?.rightText).toBe('the right strategic directions');
  });

  it('carries meaningful old-vs-new content into carousel slide 2',()=>{
    const plan = compileCreativeOutput(comparisonRoute('carousel'),comparisonBrief,{source:'generated',reason:'none',backupAssetIds:[],warnings:[],selectedSegmentIds:[],preserveAuthenticity:true});
    expect(plan.kind).toBe('carousel');
    if(plan.kind!=='carousel') return;
    expect(plan.slides[1].headline).toBe('Old way vs. better way');
    expect(plan.slides[1].comparison?.leftText).toBe('100 random hooks');
    expect(plan.slides[1].comparison?.rightText).toBe('the right strategic directions');
    expect(plan.slides[2].layoutType).toBe('statement-emphasis');
    expect(plan.slides[3].layoutType).toBe('cta-card');
    expect(plan.slides[3].headline).toBe('Ready for the better way?');
  });
});

describe('media suitability',()=>{
  it('does not force a still founder image into a screen-recording concept',()=>{
    const route:CreativeRoute = {
      id:'v',angleId:'a1',archetypeId:'how-it-works',format:'screen-recording',productionTreatmentId:'screen-native',styleId:'bold-modern-saas',conceptName:'demo',singleBigIdea:'Show the product flow.',primaryHook:'Here is how it works.',visualSummary:'screen',whyItFits:'fit',
      scores:{strategicClarity:90,visualStopPower:85,relevance:90,specificity:85,glanceComprehension:88}
    };
    const result = matchMedia(input({mediaAssets:[{id:'founder',type:'image',founderPresent:true,faceVisible:true,tags:['founder'],trustPotential:95,orientation:'portrait',segments:[]}]}),route);
    expect(result.source).toBe('generated');
    expect(result.primaryAssetId).toBeUndefined();
    expect(result.reason).toMatch(/production plan|video asset/i);
  });

  it('penalizes repeated use of the same founder image',()=>{
    const route:CreativeRoute = {
      id:'s',angleId:'a1',archetypeId:'founder-confession',format:'editorial-static',productionTreatmentId:'editorial-still',styleId:'feminine-magazine',conceptName:'founder',singleBigIdea:'Founder insight.',primaryHook:'A founder insight.',visualSummary:'founder',whyItFits:'fit',
      scores:{strategicClarity:90,visualStopPower:85,relevance:90,specificity:85,glanceComprehension:88}
    };
    const mediaAssets:CreativeEngineInput['mediaAssets'] = [{id:'founder',type:'image',founderPresent:true,faceVisible:true,tags:['founder'],trustPotential:95,textOverlaySuitability:85,orientation:'portrait',segments:[]}];
    const first = matchMedia(input({mediaAssets}),route,{});
    const repeated = matchMedia(input({mediaAssets}),route,{founder:2});
    expect(first.primaryAssetId).toBe('founder');
    expect(repeated.source).not.toBe('uploaded');
  });

  it('does not reuse a founder photo for a non-founder carousel when it already appeared',()=>{
    const mediaAssets:CreativeEngineInput['mediaAssets'] = [{id:'founder',type:'image',founderPresent:true,faceVisible:true,faceFullyVisible:true,tags:['founder'],trustPotential:95,textOverlaySuitability:85,orientation:'portrait',segments:[]}];
    const result = matchMedia(input({mediaAssets}),comparisonRoute('carousel'),{founder:1});
    expect(result.source).toBe('generated');
    expect(result.primaryAssetId).toBeUndefined();
    expect(result.reason).toMatch(/already appears elsewhere|does not specifically need/i);
  });
});

describe('render quality',()=>{
  it('keeps full headlines instead of inserting ellipses and uses face-safe top crops',async()=>{
    const provider = new SvgCompositionProvider();
    const asset = {url:'https://example.com/founder.jpg',width:1200,height:1800,mimeType:'image/jpeg' as const};
    const headline = 'The hard part is not making an ad. It is knowing what the ad should actually say and show.';
    const result = await provider.composeStatic({
      kind:'static',mode:'scene-only',aspectRatio:'4:5',width:1080,height:1350,scenePrompt:'founder',negativePrompt:[],primaryAssetId:'founder',assetSource:'uploaded',cropAnchor:'top',layoutVariant:'split-card',design:{colors:['#ffffff','#111111','#d977a8','#f2eee8'],headlineFont:'Georgia',bodyFont:'Inter',motifs:[]},
      overlays:[{role:'headline',text:headline,placement:'primary',maxLines:6},{role:'support',text:'You can open Canva or ChatGPT all day and still not know which creative idea deserves to be made.',placement:'secondary',maxLines:4}],layoutRules:[],generationReady:true
    },asset);
    const decoded = decodeURIComponent(result.url.split(',')[1]);
    const visibleText = decoded.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    expect(decoded).not.toContain('…');
    expect(visibleText).toContain(headline);
    expect(decoded).toContain('xMidYMin slice');
  });

  it('renders carousel comparison copy as the actual old and new ideas',async()=>{
    const provider = new SvgCompositionProvider();
    const plan = compileCreativeOutput(comparisonRoute('carousel'),comparisonBrief,{source:'generated',reason:'none',backupAssetIds:[],warnings:[],selectedSegmentIds:[],preserveAuthenticity:true});
    expect(plan.kind).toBe('carousel');
    if(plan.kind!=='carousel') return;
    const rendered = await provider.composeCarousel(plan,[]);
    expect(rendered).toHaveLength(4);
    expect(rendered.every(asset=>asset.width===1080 && asset.height===1350)).toBe(true);
    const slide2 = decodeURIComponent(rendered[1].url.split(',')[1]).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    expect(slide2).toContain('100 random hooks');
    expect(slide2).toContain('the right strategic directions');
    expect(slide2).not.toContain('SHIFT The familiar approach');
  });
});
