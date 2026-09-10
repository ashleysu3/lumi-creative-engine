import type { CreativeBrief, CreativeRoute } from '../schemas/index.js';
import type { MediaMatch } from '../types/internal.js';
import type { CarouselRenderSpec, CompiledCreativeOutput, ComparisonContent, RenderDesignTokens, StaticLayoutVariant, StaticRenderSpec, VideoProductionSpec } from './renderSchemas.js';
export type { CarouselRenderSpec, CarouselSlide, CompiledCreativeOutput, ComparisonContent, RenderDesignTokens, StaticLayoutVariant, StaticRenderSpec, TextOverlay, VideoProductionSpec } from './renderSchemas.js';

const staticFormats = new Set(['designed-static','editorial-static','lofi-native-graphic','notes-app','fake-message','search-bar','annotated-screenshot','ugc-photo-overlay']);
const carouselFormats = new Set(['carousel','comparison-carousel']);

function safeText(value?:string){
  if (!value) return undefined;
  const banned = /^(card|slide)\s*\d+|^(headline|subhead|body|hook|cta)\s*:|visual should|left side|right side|show |drawn across/i;
  return banned.test(value.trim()) ? undefined : value.trim();
}

function designTokens(brief:CreativeBrief):RenderDesignTokens {
  return {
    colors:brief.brandAdaptation.colors,
    headlineFont:brief.brandAdaptation.headlineFont,
    bodyFont:brief.brandAdaptation.bodyFont,
    photoTreatment:brief.brandAdaptation.photoTreatment,
    motifs:brief.brandAdaptation.motifs,
    typographyRoles:brief.brandAdaptation.typographyRoles,
    textures:brief.brandAdaptation.textures,
    patterns:brief.brandAdaptation.patterns,
    logoRules:brief.brandAdaptation.logoRules,
    components:brief.brandAdaptation.components,
    layoutNotes:brief.brandAdaptation.layoutNotes
  };
}

function layoutVariantForRoute(route:CreativeRoute):StaticLayoutVariant {
  if (route.format === 'annotated-screenshot') return 'screenshot-frame';
  if (['comparison-chart','old-way-new-way','before-after','myth-vs-reality'].includes(route.archetypeId) && route.format === 'designed-static') return 'comparison-split';
  if (route.format === 'editorial-static') return 'editorial-overlay';
  if (route.format === 'ugc-photo-overlay') return 'native-caption';
  if (route.format === 'notes-app' || route.format === 'fake-message' || route.format === 'search-bar' || route.format === 'lofi-native-graphic') return 'app-native';
  if (route.format === 'designed-static') return 'split-card';
  return 'statement-card';
}

function comparisonFor(route:CreativeRoute,brief:CreativeBrief):ComparisonContent|undefined {
  if (!['comparison-chart','old-way-new-way','before-after','myth-vs-reality'].includes(route.archetypeId)) return undefined;
  const support = safeText(brief.supportingCopy);
  if (support) {
    const needMatch = support.match(/you (?:do not|don't) need\s+(.+?)[.!?]\s*you need\s+(.+?)[.!?]?$/i);
    if (needMatch) {
      return { leftLabel:'OLD WAY',leftText:needMatch[1].trim(),rightLabel:'BETTER WAY',rightText:needMatch[2].trim() };
    }
  }
  return {
    leftLabel:route.archetypeId === 'myth-vs-reality' ? 'MYTH' : 'COMMON APPROACH',
    leftText:support ?? route.primaryHook,
    rightLabel:route.archetypeId === 'myth-vs-reality' ? 'REALITY' : 'STRATEGIC SHIFT',
    rightText:route.singleBigIdea
  };
}

function shortAnnotation(value:string) {
  return value.replace(/^Verified proof only if useful:\s*/i,'').replace(/^Unique mechanism:\s*/i,'').trim().split(/[.;]/)[0]?.trim();
}

function buildStatic(route:CreativeRoute, brief:CreativeBrief, media:MediaMatch):StaticRenderSpec {
  const headline = safeText(brief.headline) ?? route.primaryHook;
  const support = safeText(brief.supportingCopy);
  const cta = safeText(brief.cta);
  const useUploaded = Boolean(media.primaryAssetId) && media.source !== 'generated';
  const annotations = route.format === 'annotated-screenshot'
    ? brief.mustInclude.map(shortAnnotation).filter((x):x is string=>Boolean(x && x.length <= 64)).slice(0,2)
    : [];

  return {
    kind:'static',
    mode:'scene-only',
    aspectRatio:'4:5',
    width:1080,
    height:1350,
    scenePrompt:[
      brief.visualConcept,
      brief.composition,
      brief.focalPoint,
      media.cropGuidance,
      useUploaded ? 'Use the supplied real asset as the primary visual; preserve identity, expression, product details, and authenticity.' : 'Create only the visual scene/background.'
    ].filter(Boolean).join(' '),
    negativePrompt:[
      ...brief.mustAvoid,
      'No text, letters, numbers, logos, labels, UI copy, poster typography, captions, watermarks, statistics, or written words inside the generated scene.',
      'Do not crop faces, hands that are part of a meaningful gesture, products, screenshots, or important interface details.',
      'Do not invent product UI, proof, testimonials, metrics, awards, logos, or claims.'
    ],
    primaryAssetId:media.primaryAssetId,
    assetSource:media.source,
    cropAnchor:media.cropAnchor,
    layoutVariant:layoutVariantForRoute(route),
    comparison:comparisonFor(route,brief),
    annotations,
    design:designTokens(brief),
    overlays:[
      { role:'headline', text:headline, placement:'Primary text-safe area with strong mobile hierarchy; never cover face, product, or critical UI.', maxLines:6 },
      ...(support ? [{ role:'support' as const, text:support, placement:'Secondary text-safe area directly supporting the headline.', maxLines:4 }] : []),
      ...(cta ? [{ role:'cta' as const, text:cta, placement:'Lower safe zone with generous edge clearance.', maxLines:1 }] : [])
    ],
    layoutRules:[
      'Brand system owns palette, typography, logo treatment, spacing, radii, buttons, and motifs.',
      'Style is interpreted through the brand system and may not override it.',
      'Never truncate the headline with ellipses. Shrink type or switch layout instead.',
      'Support copy may be omitted before the primary headline is compromised.',
      'Keep headline and CTA independently editable without regenerating the image.',
      'Favor one obvious focal point and one obvious reading path.',
      'Reserve at least 6% outer safe margin and additional clearance around faces/products.'
    ],
    generationReady:Boolean(headline && (media.primaryAssetId || brief.visualConcept))
  };
}

function buildCarousel(route:CreativeRoute, brief:CreativeBrief, media:MediaMatch):CarouselRenderSpec {
  const headline = safeText(brief.headline) ?? route.primaryHook;
  const support = safeText(brief.supportingCopy);
  const cta = safeText(brief.cta) ?? 'Learn more';
  const compare = route.format === 'comparison-carousel' || ['comparison-chart','old-way-new-way','myth-vs-reality'].includes(route.archetypeId);
  const slide2Headline = compare ? 'The familiar approach' : 'Why this keeps feeling harder';
  const slide3Headline = compare ? 'The strategic shift' : route.singleBigIdea;
  const forbidden = ['CARD 1','CARD 2','SLIDE 1','SLIDE 2','HOOK','HEADLINE:','SUBHEAD:','BODY:','CTA SLIDE','LEFT SIDE','RIGHT SIDE','VISUAL SHOULD','SHOW'];

  return {
    kind:'carousel', aspectRatio:'4:5', width:1080, height:1350,
    primaryAssetId:media.primaryAssetId, assetSource:media.source, cropAnchor:media.cropAnchor, design:designTokens(brief),
    slides:[
      { slideNumber:1, role:'hook', headline, subhead:support, visualType: media.primaryAssetId ? 'hybrid':'type-led', visualDescription:brief.visualConcept, layoutType:'hero-hook', prohibitedRenderText:forbidden },
      { slideNumber:2, role:'problem', headline:slide2Headline, body:support, visualType:'graphic', visualDescription:'Use one concise visual contrast that makes the audience tension understandable at a glance.', layoutType: compare ? 'split-comparison':'single-idea', prohibitedRenderText:forbidden },
      { slideNumber:3, role:'shift', headline:slide3Headline, body:route.singleBigIdea, visualType:'hybrid', visualDescription:'Make the new belief, mechanism, or correction visually obvious with one supporting visual device.', layoutType:'statement-plus-evidence', prohibitedRenderText:forbidden },
      { slideNumber:4, role:'cta', headline:cta, cta, visualType:'type-led', visualDescription:'Simple branded close. One action only. No extra teaching.', layoutType:'minimal-close', prohibitedRenderText:forbidden }
    ],
    continuityRules:[
      'Only user-facing approved copy may render. Production labels and internal instructions are never render-eligible.',
      'Use consistent brand typography and spacing while varying composition enough that slides do not feel templated.',
      'Never truncate a slide headline with ellipses. Reduce type size or simplify secondary copy first.',
      'Keep each slide to one idea and mobile-readable copy density.',
      'Do not invent proof or claims on proof-oriented slides.'
    ],
    generationReady:Boolean(headline)
  };
}

function buildVideo(route:CreativeRoute, brief:CreativeBrief, media:MediaMatch):VideoProductionSpec {
  const duration = route.format === 'founder-story-video' ? 60 : route.format.startsWith('screen-recording') ? 35 : 30;
  const support = safeText(brief.supportingCopy);
  const cta = safeText(brief.cta);
  const talking = route.format.includes('talking-head') || route.format === 'founder-story-video';
  const screen = route.format.startsWith('screen-recording');

  const beats = screen ? [
    { start:0,end:4,purpose:'hook',visual:'Open on the exact product screen or result that makes the promise concrete.',onScreenText:brief.headline },
    { start:4,end:12,purpose:'context',visual:'Show where the user starts and the first decisive action.',voiceover:support },
    { start:12,end:26,purpose:'demo',visual:`Demonstrate the mechanism: ${route.singleBigIdea}` },
    { start:26,end:duration,purpose:'CTA',visual:'Finish on the most useful result screen, not a generic logo animation.',onScreenText:cta }
  ] : [
    { start:0,end:4,purpose:'hook',visual:'Open immediately on the strongest human action or expression. No intro animation.',onScreenText:brief.headline },
    { start:4,end:12,purpose:'problem or tension',visual:brief.visualConcept,voiceover:support },
    { start:12,end:Math.min(24,duration-6),purpose:'mechanism or shift',visual:`Demonstrate or explain: ${route.singleBigIdea}` },
    { start:Math.min(24,duration-6),end:duration,purpose:'CTA',visual:'Resolve on a clear human, product, interface, or outcome visual.',onScreenText:cta }
  ];

  return {
    kind:'video', format:route.format, hook:brief.headline, durationSeconds:duration,
    primaryAssetId:media.primaryAssetId, selectedSegmentIds:media.selectedSegmentIds,
    beats,
    filmingNotes:[
      talking ? 'Favor natural founder delivery over polished spokesperson delivery.' : 'Keep footage visually active and specific to the message.',
      screen ? 'Use real product screens only. Do not fabricate interface states.' : 'Use real footage when available; do not force a still image into a video concept.',
      'Captions must be mobile readable and may not cover the speaker’s mouth, product, or key UI.',
      'Use uploaded B-roll segments when they score strongly; do not force weak footage just because it exists.',
      'No invented testimonials, results, or demonstrations.'
    ],
    generationReady:Boolean(brief.headline && (media.primaryAssetId || !['testimonial-video'].includes(route.format)))
  };
}

export function compileCreativeOutput(route: CreativeRoute, brief: CreativeBrief, media: MediaMatch): CompiledCreativeOutput {
  if (staticFormats.has(route.format)) return buildStatic(route,brief,media);
  if (carouselFormats.has(route.format)) return buildCarousel(route,brief,media);
  return buildVideo(route,brief,media);
}
