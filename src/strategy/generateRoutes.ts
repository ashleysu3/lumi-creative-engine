import type { CreativeEngineInput, CreativeRoute } from '../schemas/index.js';
import { scoreArchetypes } from './scoreArchetypes.js';
import { buildCreativeMix } from './buildCreativeMix.js';

const treatmentByFormat: Record<string,string> = {
  'designed-static':'editorial-still','editorial-static':'editorial-still','lofi-native-graphic':'lofi-app-native','notes-app':'lofi-app-native','fake-message':'lofi-app-native','search-bar':'lofi-app-native','annotated-screenshot':'product-editorial','ugc-photo-overlay':'creator-selfie','talking-head':'creator-selfie','talking-head-captions':'creator-selfie','broll-text':'cinematic-broll','broll-voiceover':'cinematic-broll','screen-recording':'screen-native','screen-recording-facecam':'screen-native','ugc-demo':'handheld-ugc','founder-story-video':'creator-selfie','testimonial-video':'raw-iphone','carousel':'editorial-still','comparison-carousel':'editorial-still','motion-graphic':'designed-motion','kinetic-typography':'designed-motion','meme-reel':'lofi-app-native','pov-video':'raw-iphone'
};

const styleByFormat: Record<string,string> = {
  'designed-static':'direct-response','editorial-static':'feminine-magazine','lofi-native-graphic':'handwritten-lofi','notes-app':'iphone-native','fake-message':'iphone-native','search-bar':'iphone-native','annotated-screenshot':'bold-modern-saas','ugc-photo-overlay':'iphone-native','talking-head':'iphone-native','talking-head-captions':'direct-response','broll-text':'luxury-editorial','broll-voiceover':'luxury-editorial','screen-recording':'bold-modern-saas','screen-recording-facecam':'bold-modern-saas','ugc-demo':'iphone-native','founder-story-video':'iphone-native','testimonial-video':'iphone-native','carousel':'clean-swiss','comparison-carousel':'clean-swiss','motion-graphic':'direct-response','kinetic-typography':'direct-response','meme-reel':'iphone-native','pov-video':'iphone-native'
};

function hookFor(archetypeId:string, angleName:string, thesis:string) {
  const short = thesis.replace(/\s+/g,' ').trim();
  if (archetypeId === 'you-dont-need-x') return `You don't need more tactics. You need ${angleName.toLowerCase()}.`;
  if (archetypeId === 'contrarian-belief') return `The advice everyone repeats about ${angleName.toLowerCase()} is incomplete.`;
  if (archetypeId === 'founder-confession') return `I built this because I was tired of pretending ${short.toLowerCase()}.`;
  if (archetypeId === 'question-led') return `What if ${short.charAt(0).toLowerCase()+short.slice(1)}?`;
  if (archetypeId === 'old-way-new-way') return `The old way vs. what actually works now.`;
  if (archetypeId === 'how-it-works') return `Here's how ${angleName.toLowerCase()} actually works.`;
  return short.endsWith('.') ? short.slice(0,-1) : short;
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
    const pick = scored.find(s => !usedArchetypes.has(s.archetype.id)) ?? scored[i % Math.max(1, scored.length)];
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
      whyItFits:[...pick.reasons,`format mix selected ${format}`].join('; ') || 'Strong strategic fit.',
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
