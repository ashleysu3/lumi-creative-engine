import type { CreativeBrief, CreativeRoute } from '../schemas/index.js';
import type { MediaMatch } from '../types/internal.js';

export type StaticRenderSpec = {
  kind:'static'; mode:'scene-only'|'fully-designed'; aspectRatio:'4:5'; width:number; height:number;
  scenePrompt:string; negativePrompt:string[]; primaryAssetId?:string;
  overlays:{ role:'headline'|'support'|'cta'; text:string; placement:string }[];
};
export type CarouselSlide = { slideNumber:number; role:string; headline:string; body?:string; visualDirection:string };
export type CarouselRenderSpec = { kind:'carousel'; aspectRatio:'4:5'; slides:CarouselSlide[] };
export type VideoProductionSpec = { kind:'video'; format:string; hook:string; durationSeconds:number; beats:{ start:number; end:number; purpose:string; visual:string; copy?:string }[]; primaryAssetId?:string };
export type CompiledCreativeOutput = StaticRenderSpec | CarouselRenderSpec | VideoProductionSpec;

const staticFormats = new Set(['designed-static','editorial-static','lofi-native-graphic','notes-app','fake-message','search-bar','annotated-screenshot','ugc-photo-overlay']);
const carouselFormats = new Set(['carousel','comparison-carousel']);

export function compileCreativeOutput(route: CreativeRoute, brief: CreativeBrief, media: MediaMatch): CompiledCreativeOutput {
  if (staticFormats.has(route.format)) {
    return {
      kind:'static', mode:'scene-only', aspectRatio:'4:5', width:1080, height:1350,
      scenePrompt:[brief.visualConcept,brief.composition,brief.focalPoint,media.cropGuidance].filter(Boolean).join(' '),
      negativePrompt:[...brief.mustAvoid,'No text, letters, numbers, logos, labels, UI copy, poster typography, captions, watermarks or written words inside the generated scene.'],
      primaryAssetId:media.primaryAssetId,
      overlays:[
        {role:'headline',text:brief.headline,placement:'Primary text-safe area; never cover a face, product, or critical UI.'},
        ...(brief.supportingCopy ? [{role:'support' as const,text:brief.supportingCopy,placement:'Directly supports headline with clear spacing.'}] : []),
        ...(brief.cta ? [{role:'cta' as const,text:brief.cta,placement:'Lower safe zone with edge clearance.'}] : [])
      ]
    };
  }
  if (carouselFormats.has(route.format)) {
    const core = brief.headline;
    return {
      kind:'carousel', aspectRatio:'4:5',
      slides:[
        {slideNumber:1,role:'hook',headline:core,visualDirection:brief.visualConcept},
        {slideNumber:2,role:'tension',headline:'Why the old approach keeps feeling harder',body:brief.supportingCopy,visualDirection:'Show the audience problem with one clear visual contrast; no production labels.'},
        {slideNumber:3,role:'shift',headline:route.singleBigIdea,visualDirection:'Make the core strategic shift visually obvious.'},
        {slideNumber:4,role:'action',headline:brief.cta || 'See the better way',visualDirection:'Simple branded closing slide with one action.'}
      ]
    };
  }
  return {
    kind:'video', format:route.format, hook:brief.headline, durationSeconds: route.format === 'founder-story-video' ? 60 : 30, primaryAssetId:media.primaryAssetId,
    beats:[
      {start:0,end:4,purpose:'hook',visual:'Open immediately on the strongest subject/action. No logo animation or intro.',copy:brief.headline},
      {start:4,end:12,purpose:'problem or tension',visual:brief.visualConcept,copy:brief.supportingCopy},
      {start:12,end:24,purpose:'mechanism or shift',visual:`Demonstrate or explain: ${route.singleBigIdea}`},
      {start:24,end:30,purpose:'CTA',visual:'Resolve on a clear human, product, or outcome visual.',copy:brief.cta}
    ]
  };
}
