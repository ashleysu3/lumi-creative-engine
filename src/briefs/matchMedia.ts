import type { CreativeEngineInput, CreativeRoute, MediaAsset } from '../schemas/index.js';
import type { MediaMatch } from '../types/internal.js';

function scoreAsset(asset: MediaAsset, input: CreativeEngineInput, route: CreativeRoute) {
  let score = 35;
  const reasons: string[] = [];
  const isFounderLed = input.brand.photography.founderLed;
  const wantsScreenshot = route.format === 'annotated-screenshot' || route.format.startsWith('screen-recording');
  const wantsVideo = ['talking-head','talking-head-captions','broll-text','broll-voiceover','ugc-demo','founder-story-video','testimonial-video','meme-reel','pov-video'].includes(route.format);

  if (isFounderLed && asset.founderPresent) { score += 20; reasons.push('founder present'); }
  if (isFounderLed && asset.faceVisible) { score += 10; reasons.push('face visible'); }
  if (wantsScreenshot && asset.type === 'screenshot') { score += 30; reasons.push('strong screenshot-format fit'); }
  if (wantsVideo && asset.type === 'video') { score += 22; reasons.push('video-format fit'); }
  if (!wantsVideo && ['image','screenshot'].includes(asset.type)) { score += 12; reasons.push('static-format fit'); }
  if (asset.trustPotential != null) { score += Math.round((asset.trustPotential - 50) * 0.15); if (asset.trustPotential >= 75) reasons.push('high trust potential'); }
  if (asset.textOverlaySuitability != null && ['designed-static','editorial-static','ugc-photo-overlay'].includes(route.format)) { score += Math.round((asset.textOverlaySuitability - 50) * 0.1); }
  const tags = asset.tags.join(' ').toLowerCase();
  if (route.archetypeId.includes('product') && /product|demo|interface|ui/.test(tags)) { score += 10; reasons.push('product-content fit'); }
  if (route.archetypeId.includes('aspirational') && /lifestyle|aspirational|outcome/.test(tags)) { score += 8; reasons.push('emotional fit'); }
  return { score: Math.max(0,Math.min(100,score)), reasons };
}

export function matchMedia(input: CreativeEngineInput, route: CreativeRoute): MediaMatch {
  if (!input.mediaAssets.length) return { source:'generated', reason:'No uploaded media assets are available.', backupAssetIds:[], warnings:[] };
  const ranked = input.mediaAssets.map(asset => ({ asset, ...scoreAsset(asset,input,route) })).sort((a,b)=>b.score-a.score);
  const best = ranked[0];
  const strongFounderExists = input.mediaAssets.some(a => a.founderPresent && a.faceVisible && (a.trustPotential ?? 70) >= 65);
  const source = best.score >= 80 ? 'uploaded' : best.score >= 65 ? 'hybrid' : 'generated';
  const warnings: string[] = [];
  if (input.brand.photography.founderLed && strongFounderExists && !best.asset.founderPresent && !route.format.startsWith('screen-recording') && route.format !== 'annotated-screenshot') warnings.push('Strong founder asset exists but was not selected; review before rendering.');
  return {
    source,
    primaryAssetId: source === 'generated' ? undefined : best.asset.id,
    score: best.score,
    reason: best.reasons.length ? best.reasons.join('; ') : `Best available asset scored ${best.score}/100.`,
    backupAssetIds: ranked.slice(1,4).filter(x=>x.score>=50).map(x=>x.asset.id),
    cropGuidance: best.asset.faceVisible ? 'Preserve full face and natural headroom. Do not place text over face.' : 'Preserve the primary subject and create text-safe negative space when possible.',
    warnings
  };
}
