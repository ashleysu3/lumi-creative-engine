import type { CreativeEngineInput, CreativeRoute } from '../schemas/index.js';
import { getFormat } from '../libraries/formats.js';
import { scoreArchetypes } from './scoreArchetypes.js';
import { buildCreativeMix } from './buildCreativeMix.js';

const treatmentByFormat: Record<string,string> = {
  'designed-static':'editorial-still','editorial-static':'editorial-still','lofi-native-graphic':'lofi-app-native','notes-app':'lofi-app-native','fake-message':'lofi-app-native','search-bar':'lofi-app-native','annotated-screenshot':'product-editorial','ugc-photo-overlay':'creator-selfie','talking-head':'creator-selfie','talking-head-captions':'creator-selfie','broll-text':'cinematic-broll','broll-voiceover':'cinematic-broll','screen-recording':'screen-native','screen-recording-facecam':'screen-native','ugc-demo':'handheld-ugc','founder-story-video':'creator-selfie','testimonial-video':'raw-iphone','carousel':'editorial-still','comparison-carousel':'editorial-still','motion-graphic':'designed-motion','kinetic-typography':'designed-motion','meme-reel':'lofi-app-native','pov-video':'raw-iphone'
};

const styleByFormat: Record<string,string> = {
  'designed-static':'direct-response','editorial-static':'feminine-magazine','lofi-native-graphic':'handwritten-lofi','notes-app':'iphone-native','fake-message':'iphone-native','search-bar':'iphone-native','annotated-screenshot':'bold-modern-saas','ugc-photo-overlay':'iphone-native','talking-head':'iphone-native','talking-head-captions':'direct-response','broll-text':'luxury-editorial','broll-voiceover':'luxury-editorial','screen-recording':'bold-modern-saas','screen-recording-facecam':'bold-modern-saas','ugc-demo':'iphone-native','founder-story-video':'iphone-native','testimonial-video':'iphone-native','carousel':'clean-swiss','comparison-carousel':'clean-swiss','motion-graphic':'direct-response','kinetic-typography':'direct-response','meme-reel':'iphone-native','pov-video':'iphone-native'
};

const formatCompatibilityFallback: Record<string,string[]> = {
  'designed-static':['old-way-new-way','big-editorial-headline','comparison-chart','proof-first','one-big-benefit','contrarian-belief','problem-solution'],
  'editorial-static':['big-editorial-headline','contrarian-belief','founder-confession','founder-story','magazine-editorial','identity-callout'],
  'annotated-screenshot':['annotated-screenshot','how-it-works','feature-to-benefit','proof-first','result-dashboard'],
  'ugc-photo-overlay':['identity-callout','this-is-for-you-if','founder-confession','aspirational-outcome','micro-moment'],
  'screen-recording':['how-it-works','feature-to-benefit','one-big-benefit','result-dashboard'],
  'screen-recording-facecam':['how-it-works','founder-story','feature-to-benefit'],
  'talking-head':['founder-story','founder-confession','contrarian-belief','objection-crusher','three-mistakes'],
  'carousel':['three-mistakes','mini-framework','comparison-chart','myth-vs-reality','old-way-new-way','problem-solution'],
  'comparison-carousel':['comparison-chart','old-way-new-way','you-dont-need-x','myth-vs-reality']
};

function compact(value:string) {
  return value.replace(/\s+/g,' ').trim().replace(/\.$/,'');
}

function hookFor(archetypeId:string, angleName:string, thesis:string) {
  const short = compact(thesis);
  if (archetypeId === 'you-dont-need-x') return `You don't need more tactics. You need ${angleName.toLowerCase()}.`;
  if (archetypeId === 'contrarian-belief') return `The advice everyone repeats about ${angleName.toLowerCase()} is incomplete.`;
  if (archetypeId === 'founder-confession') return `I built this because I was tired of the same problem: ${short.charAt(0).toLowerCase()+short.slice(1)}.`;
  if (archetypeId === 'question-led') return `What if ${short.charAt(0).toLowerCase()+short.slice(1)}?`;
  if (archetypeId === 'old-way-new-way') return `${angleName}: the old way vs. the better way.`;
  if (archetypeId === 'comparison-chart') return `${angleName}: what changes when strategy leads the creative.`;
  if (archetypeId === 'how-it-works') return `Here's how ${angleName.toLowerCase()} actually works.`;
  if (archetypeId === 'annotated-screenshot') return `See exactly how ${angleName.toLowerCase()} works inside the product.`;
  return short;
}

function compatibleArchetypes(format:string):Set<string> {
  const fromLibrary = getFormat(format)?.bestWithArchetypes ?? [];
  return new Set(fromLibrary.length ? fromLibrary : (formatCompatibilityFallback[format] ?? []));
}

export function generateRoutes(input: CreativeEngineInput): CreativeRoute[] {
  const mix = buildCreativeMix(input);
  const anglePool = input.angles.length ? input.angles : [{id:'default',name:input.offer.name,coreThesis:input.offer.summary}];
  const formats = mix.flatMap(slot => Array.from({length:slot.count},()=>slot.format));
  const usedArchetypes = new Set<string>();
  const routes: CreativeRoute[] = [];

  formats.forEach((format, i) => {
    const angle = anglePool[i % anglePool.length];
    const scored = scoreArchetypes(input, angle.id);
    const compatible = compatibleArchetypes(format);
    const formatScored = compatible.size ? scored.filter(s => compatible.has(s.archetype.id)) : scored;
    const pick = formatScored.find(s => !usedArchetypes.has(s.archetype.id))
      ?? formatScored[0]
      ?? scored.find(s => !usedArchetypes.has(s.archetype.id))
      ?? scored[0];
    if (!pick) throw new Error(`No creative archetypes are available for format ${format}.`);
    usedArchetypes.add(pick.archetype.id);
    const base = Math.min(100, pick.score);
    routes.push({
      id:`route-${i+1}`,
      angleId:angle.id,
      archetypeId:pick.archetype.id,
      format:format as CreativeRoute['format'],
      productionTreatmentId:treatmentByFormat[format] ?? 'editorial-still',
      styleId:styleByFormat[format] ?? 'direct-response',
      conceptName:`${pick.archetype.name}: ${angle.name}`,
      singleBigIdea:angle.coreThesis,
      primaryHook:hookFor(pick.archetype.id, angle.name, angle.coreThesis),
      visualSummary:`Express “${angle.coreThesis}” using the ${pick.archetype.name} structure in a ${format.replaceAll('-',' ')} format.`,
      whyItFits:[...pick.reasons,`format ${format} is compatible with ${pick.archetype.name}`].join('; ') || 'Strong strategic and format fit.',
      scores:{
        strategicClarity:Math.min(100,base+6),
        visualStopPower:Math.min(100,base + (['big-editorial-headline','meme-format','contrarian-belief'].includes(pick.archetype.id)?10:3)),
        relevance:Math.min(100,base+5),
        specificity:Math.min(100,base),
        glanceComprehension:Math.min(100,base + (format.includes('static')?8:4))
      }
    });
  });

  return routes;
}
