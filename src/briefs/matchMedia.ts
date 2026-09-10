import type { CreativeEngineInput, CreativeRoute, MediaAsset } from '../schemas/index.js';
import type { MediaMatch } from '../types/internal.js';

function clamp(n:number){ return Math.max(0, Math.min(100, Math.round(n))); }

export type MediaUsageCounts = Record<string,number>;

function isVideoFormat(format:string) {
  return ['talking-head','talking-head-captions','broll-text','broll-voiceover','screen-recording','screen-recording-facecam','ugc-demo','founder-story-video','testimonial-video','motion-graphic','kinetic-typography','meme-reel','pov-video'].includes(format);
}

function scoreAsset(asset: MediaAsset, input: CreativeEngineInput, route: CreativeRoute, usage:MediaUsageCounts) {
  let score = 18;
  const reasons: string[] = [];
  const warnings:string[] = [];
  const isFounderLed = input.brand.photography.founderLed;
  const wantsScreenshot = route.format === 'annotated-screenshot';
  const wantsVideo = isVideoFormat(route.format);
  const wantsStatic = !wantsVideo && !route.format.includes('carousel') && !wantsScreenshot;
  const tags = asset.tags.join(' ').toLowerCase();

  const angle = input.angles.find(a => a.id === route.angleId);
  const angleText = `${angle?.name ?? ''} ${angle?.coreThesis ?? ''} ${angle?.customerTruth ?? ''}`.toLowerCase();
  const strategicMatches = asset.tags.filter(t => t.length > 2 && angleText.includes(t.toLowerCase())).length;
  if (strategicMatches) { score += Math.min(18, strategicMatches * 6); reasons.push('strategic angle fit'); }

  if (wantsScreenshot) {
    if (asset.type === 'screenshot') { score += 38; reasons.push('required screenshot-format fit'); }
    else { score -= 55; warnings.push('annotated screenshot requires a real screenshot asset'); }
  } else if (wantsVideo) {
    if (asset.type === 'video') { score += 30; reasons.push('video-format fit'); }
    else { score -= 35; warnings.push('video concept should not use a still image as its primary production asset'); }
  } else if (wantsStatic && ['image','screenshot'].includes(asset.type)) {
    score += 16; reasons.push('static-format fit');
  }

  if (/founder|confession|story|identity|pov/.test(route.archetypeId) && asset.founderPresent) { score += 15; reasons.push('archetype-founder fit'); }
  if (/product|proof|dashboard|screenshot|how-it-works|feature/.test(route.archetypeId) && /product|demo|interface|ui|proof|dashboard/.test(tags)) { score += 15; reasons.push('archetype-content fit'); }

  if (isFounderLed && asset.founderPresent && !wantsScreenshot && !wantsVideo) { score += 8; reasons.push('founder present'); }
  if (isFounderLed && asset.faceVisible && !wantsScreenshot && !wantsVideo) { score += 5; reasons.push('face visible'); }
  if (asset.faceFullyVisible === false && asset.founderPresent) { score -= 18; warnings.push('founder face is not fully visible'); }
  if (asset.faceProminence === 'high') score += 5;
  if (asset.faceProminence === 'low' && asset.founderPresent) { score -= 7; warnings.push('founder is visually small for a trust-led concept'); }
  if (asset.cropFlexibility != null) score += ((asset.cropFlexibility - 50) / 50) * 6;
  if (asset.contextRelevance != null) score += ((asset.contextRelevance - 50) / 50) * 7;
  if (asset.visualProfessionalism != null) score += ((asset.visualProfessionalism - 50) / 50) * 5;
  if (asset.trustPotential != null) score += (asset.trustPotential / 100) * 7;

  const emotionWords = [...input.audience.desires, ...input.audience.pains].join(' ').toLowerCase();
  const emotionMatches = asset.tags.filter(t => t.length > 2 && emotionWords.includes(t.toLowerCase())).length;
  if (emotionMatches) { score += Math.min(8, emotionMatches * 3); reasons.push('emotional fit'); }

  if (asset.orientation === 'portrait') score += 5;
  if (asset.negativeSpace === 'high') score += 5;
  if (asset.negativeSpace === 'low' && wantsStatic) score -= 4;
  if (asset.textOverlaySuitability != null && wantsStatic) score += (asset.textOverlaySuitability / 100) * 6;
  if (asset.width && asset.height && asset.height >= asset.width) score += 4;
  if (asset.nativeFeedFeel != null) score += (asset.nativeFeedFeel / 100) * 4;

  const reuseCount = usage[asset.id] ?? 0;
  if (reuseCount > 0 && !wantsScreenshot && !wantsVideo) {
    const penalty = Math.min(32,reuseCount*16);
    score -= penalty;
    reasons.push(`asset reuse penalty -${penalty}`);
  }

  return { score: clamp(score), reasons, warnings };
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

function generated(reason:string,warnings:string[]=[]):MediaMatch {
  return { source:'generated', reason, backupAssetIds:[], cropAnchor:'center', warnings, selectedSegmentIds:[], preserveAuthenticity:true };
}

export function matchMedia(input: CreativeEngineInput, route: CreativeRoute, usage:MediaUsageCounts = {}): MediaMatch {
  if (!input.mediaAssets.length) {
    return generated(isVideoFormat(route.format) ? 'No uploaded production media is available; create this as a production plan.' : 'No uploaded media assets are available.');
  }

  if (route.format === 'annotated-screenshot') {
    const screenshots = input.mediaAssets.filter(asset=>asset.type==='screenshot');
    if (!screenshots.length) return generated('Annotated Screenshot requires a real product screenshot; none was supplied.',['Do not fabricate product UI. Supply a real screenshot or use another format.']);
  }

  if (isVideoFormat(route.format)) {
    const videos = input.mediaAssets.filter(asset=>asset.type==='video');
    if (!videos.length) return generated('No suitable video asset is available. Keep this concept as a production plan instead of forcing a still image into it.');
  }

  let ranked = input.mediaAssets
    .filter(asset=>asset.type!=='logo' && asset.type!=='other')
    .map(asset => ({ asset, ...scoreAsset(asset,input,route,usage) }))
    .sort((a,b)=>b.score-a.score);

  if (route.format === 'annotated-screenshot') ranked = ranked.filter(r=>r.asset.type==='screenshot');
  if (isVideoFormat(route.format)) ranked = ranked.filter(r=>r.asset.type==='video');

  if (!ranked.length) return generated('No media asset is appropriate for this format.');

  const best = ranked[0];
  const founderEligibleRoute = input.brand.photography.founderLed && !isVideoFormat(route.format) && route.format !== 'annotated-screenshot';
  const strongFounder = ranked.find(r => r.asset.founderPresent && r.asset.faceVisible && r.asset.faceFullyVisible !== false && (r.asset.trustPotential ?? 70) >= 70 && r.score >= 62);

  if (founderEligibleRoute && strongFounder && (usage[strongFounder.asset.id] ?? 0) === 0 && ['ugc-photo-overlay','editorial-static'].includes(route.format)) {
    ranked = [strongFounder,...ranked.filter(r=>r.asset.id!==strongFounder.asset.id)];
  }

  const selected = ranked[0];
  const selectedUseCount = usage[selected.asset.id] ?? 0;
  const exactScreenshot = route.format === 'annotated-screenshot' && selected.asset.type === 'screenshot';
  const exactVideo = isVideoFormat(route.format) && selected.asset.type === 'video';
  const strongFounderChosen = founderEligibleRoute && selectedUseCount < 2 && selected.asset.founderPresent && selected.asset.faceVisible && selected.asset.faceFullyVisible !== false && (selected.asset.trustPotential ?? 70) >= 70;

  let source: MediaMatch['source'];
  if (exactScreenshot || exactVideo || strongFounderChosen || selected.score >= 80) source = 'uploaded';
  else if (selected.score >= 64) source = 'hybrid';
  else source = 'generated';

  const warnings = [...selected.warnings];
  if (founderEligibleRoute && strongFounder && selected.asset.id !== strongFounder.asset.id) warnings.push('A stronger founder image exists, but this concept is intentionally using another visual to keep the batch diverse.');
  if (selectedUseCount >= 2) warnings.push('This asset has already been used multiple times in the batch; prefer another visual if possible.');

  if (source === 'generated') {
    return generated(`Best uploaded asset scored ${selected.score}/100 and is not strong enough for this concept.`,warnings);
  }

  const cropAnchor:MediaMatch['cropAnchor'] = selected.asset.faceVisible ? 'top' : 'center';
  return {
    source,
    primaryAssetId:selected.asset.id,
    score:selected.score,
    suitabilityScore:selected.score,
    reason:selected.reasons.length ? selected.reasons.join('; ') : `Best available asset scored ${selected.score}/100.`,
    backupAssetIds: ranked.slice(1,4).filter(x=>x.score>=58).map(x=>x.asset.id),
    cropGuidance:selected.asset.faceVisible
      ? 'Keep the founder face and headroom fully visible. Favor a top-anchored crop before sacrificing the face. Preserve natural limbs and meaningful gestures.'
      : 'Preserve the primary subject and create text-safe negative space when possible.',
    cropAnchor,
    warnings,
    selectedSegmentIds:selectSegments(selected.asset,route),
    preserveAuthenticity:true
  };
}
