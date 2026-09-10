import type { CreativeEngineInput, CreativeRoute, MediaAsset } from '../schemas/index.js';
import type { MediaMatch } from '../types/internal.js';

function clamp(n:number){ return Math.max(0, Math.min(100, Math.round(n))); }

function scoreAsset(asset: MediaAsset, input: CreativeEngineInput, route: CreativeRoute) {
  let score = 20;
  const reasons: string[] = [];
  const isFounderLed = input.brand.photography.founderLed;
  const wantsScreenshot = route.format === 'annotated-screenshot' || route.format.startsWith('screen-recording');
  const wantsVideo = ['talking-head','talking-head-captions','broll-text','broll-voiceover','ugc-demo','founder-story-video','testimonial-video','meme-reel','pov-video'].includes(route.format);
  const wantsStatic = !wantsVideo && !route.format.includes('carousel');
  const tags = asset.tags.join(' ').toLowerCase();

  const angle = input.angles.find(a => a.id === route.angleId);
  const angleText = `${angle?.name ?? ''} ${angle?.coreThesis ?? ''}`.toLowerCase();
  const strategicMatches = asset.tags.filter(t => angleText.includes(t.toLowerCase())).length;
  if (strategicMatches) { score += Math.min(20, strategicMatches * 7); reasons.push('strategic angle fit'); }

  if (wantsScreenshot && asset.type === 'screenshot') { score += 15; reasons.push('screenshot-format fit'); }
  else if (wantsVideo && asset.type === 'video') { score += 15; reasons.push('video-format fit'); }
  else if (wantsStatic && ['image','screenshot'].includes(asset.type)) { score += 12; reasons.push('static-format fit'); }

  if (/founder|confession|story|identity|pov/.test(route.archetypeId) && asset.founderPresent) { score += 15; reasons.push('archetype-founder fit'); }
  if (/product|proof|dashboard|screenshot|how-it-works/.test(route.archetypeId) && /product|demo|interface|ui|proof|dashboard/.test(tags)) { score += 15; reasons.push('archetype-content fit'); }

  if (isFounderLed && asset.founderPresent) { score += 8; reasons.push('founder present'); }
  if (isFounderLed && asset.faceVisible) { score += 5; reasons.push('face visible'); }
  if (asset.trustPotential != null) score += (asset.trustPotential / 100) * 7;

  const emotionWords = [...input.audience.desires, ...input.audience.pains].join(' ').toLowerCase();
  const emotionMatches = asset.tags.filter(t => emotionWords.includes(t.toLowerCase())).length;
  if (emotionMatches) { score += Math.min(10, emotionMatches * 4); reasons.push('emotional fit'); }

  if (asset.orientation === 'portrait') score += 6;
  if (asset.negativeSpace === 'high') score += 4;
  if (asset.textOverlaySuitability != null && ['designed-static','editorial-static','ugc-photo-overlay','carousel','comparison-carousel'].includes(route.format)) score += (asset.textOverlaySuitability / 100) * 5;
  if (asset.width && asset.height && asset.height >= asset.width) score += 5;
  if (asset.nativeFeedFeel != null) score += (asset.nativeFeedFeel / 100) * 5;

  return { score: clamp(score), reasons };
}

function selectSegments(asset: MediaAsset | undefined, route: CreativeRoute): string[] {
  if (!asset || asset.type !== 'video' || !asset.segments.length) return [];
  const query = `${route.archetypeId} ${route.format} ${route.singleBigIdea}`.toLowerCase();
  return asset.segments
    .map(segment => {
      const haystack = [...segment.tags, ...segment.purposeHints].join(' ').toLowerCase();
      let score = segment.score ?? 50;
      for (const token of query.split(/\W+/).filter(t => t.length > 3)) if (haystack.includes(token)) score += 8;
      return { id:segment.id, score };
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,3)
    .map(s=>s.id);
}

export function matchMedia(input: CreativeEngineInput, route: CreativeRoute): MediaMatch {
  if (!input.mediaAssets.length) return { source:'generated', reason:'No uploaded media assets are available.', backupAssetIds:[], warnings:[], selectedSegmentIds:[], preserveAuthenticity:true };

  let ranked = input.mediaAssets.map(asset => ({ asset, ...scoreAsset(asset,input,route) })).sort((a,b)=>b.score-a.score);
  const strongFounder = input.mediaAssets
    .filter(a => a.founderPresent && a.faceVisible && (a.trustPotential ?? 70) >= 65)
    .map(asset => ({ asset, ...scoreAsset(asset,input,route) }))
    .sort((a,b)=>b.score-a.score)[0];

  const founderEligibleRoute = input.brand.photography.founderLed && !route.format.startsWith('screen-recording') && route.format !== 'annotated-screenshot';
  if (founderEligibleRoute && strongFounder) {
    ranked = [strongFounder, ...ranked.filter(r => r.asset.id !== strongFounder.asset.id)];
  }

  const best = ranked[0];
  const wantsScreenshot = route.format === 'annotated-screenshot' || route.format.startsWith('screen-recording');
  const wantsVideo = ['talking-head','talking-head-captions','broll-text','broll-voiceover','ugc-demo','founder-story-video','testimonial-video','meme-reel','pov-video'].includes(route.format);
  const exactFormatAsset = (wantsScreenshot && best.asset.type === 'screenshot') || (wantsVideo && best.asset.type === 'video');
  const strongFounderChosen = founderEligibleRoute && best.asset.founderPresent && best.asset.faceVisible && (best.asset.trustPotential ?? 70) >= 65;

  let source: MediaMatch['source'];
  if (strongFounderChosen || (exactFormatAsset && best.score >= 50) || best.score >= 78) source = 'uploaded';
  else if (best.score >= 58) source = 'hybrid';
  else source = 'generated';

  const warnings: string[] = [];
  if (founderEligibleRoute && strongFounder && !best.asset.founderPresent) warnings.push('Strong founder asset exists but was not selected; review before rendering.');

  return {
    source,
    primaryAssetId: source === 'generated' ? undefined : best.asset.id,
    score: best.score,
    reason: best.reasons.length ? best.reasons.join('; ') : `Best available asset scored ${best.score}/100.`,
    backupAssetIds: ranked.slice(1,4).filter(x=>x.score>=50).map(x=>x.asset.id),
    cropGuidance: best.asset.faceVisible ? 'Preserve full face, limbs, natural headroom, and gesture. Keep meaningful text off the face.' : 'Preserve the primary subject and create text-safe negative space when possible.',
    warnings,
    selectedSegmentIds: selectSegments(source === 'generated' ? undefined : best.asset, route),
    preserveAuthenticity: true
  };
}
