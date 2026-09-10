import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../schemas/index.js';
import type { MediaMatch, QualityResult } from '../types/internal.js';
import { getFormat } from '../libraries/formats.js';
import { semanticQA } from './semanticQA.js';

export function qualityCheck(input: CreativeEngineInput, route: CreativeRoute, brief: CreativeBrief, media: MediaMatch): QualityResult {
  const semantic = semanticQA(brief);
  const criticalFailures = [...semantic.criticalFailures];
  const warnings = [...semantic.warnings, ...media.warnings];

  let brandFidelity = 88;
  const approvedHeadlineFamily = input.brand.typography.roles?.headline?.family ?? input.brand.typography.headlineFamily;
  if (approvedHeadlineFamily && brief.brandAdaptation.headlineFont !== approvedHeadlineFamily) {
    brandFidelity -= 25;
    criticalFailures.push('Headline font does not match the approved brand font.');
  }
  if (brief.brandAdaptation.colors.some(c => input.brand.colors.prohibited.includes(c))) {
    brandFidelity -= 30;
    criticalFailures.push('A prohibited brand color was selected.');
  }

  const formatDef = getFormat(route.format);
  if (formatDef?.bestWithArchetypes.length && !formatDef.bestWithArchetypes.includes(route.archetypeId)) {
    warnings.push(`Archetype ${route.archetypeId} is not a preferred match for ${route.format}; format fidelity may be weak.`);
  }

  if (route.format === 'annotated-screenshot') {
    const chosen = input.mediaAssets.find(a=>a.id===media.primaryAssetId);
    if (!chosen || chosen.type !== 'screenshot') {
      criticalFailures.push('Annotated Screenshot requires a real screenshot. Do not fabricate product UI.');
    }
  }

  let trust = 76;
  const chosen = input.mediaAssets.find(a => a.id === media.primaryAssetId);
  if (input.brand.photography.founderLed) {
    if (chosen?.founderPresent && chosen.faceVisible) {
      trust = chosen.faceFullyVisible === false ? 72 : 94;
      if (chosen.faceFullyVisible === false) warnings.push('Founder face is not fully visible; use a safer crop or another asset.');
      if (chosen.faceProminence === 'low') { trust -= 8; warnings.push('Founder is visually small for a trust-led execution.'); }
    } else if (input.mediaAssets.some(a => a.founderPresent && a.faceVisible) && !route.format.startsWith('screen-recording') && route.format !== 'annotated-screenshot') {
      trust = 70;
      warnings.push('Founder-led brand has founder media available, but this concept is using another visual for format fit or batch diversity.');
    }
  }

  const strategicBase = Math.round((route.scores.strategicClarity + route.scores.relevance + route.scores.specificity) / 3);
  const strategic = Math.max(0,strategicBase - (formatDef?.bestWithArchetypes.length && !formatDef.bestWithArchetypes.includes(route.archetypeId) ? 8 : 0));
  const readability = brief.headline.length <= 90 ? 94 : brief.headline.length <= 130 ? 84 : 72;
  if (brief.headline.length > 115) warnings.push('Headline is long; renderer must shrink type or switch layout rather than truncate it.');

  let qualityScore = Math.round((brandFidelity + trust + strategic + readability) / 4);
  if (criticalFailures.length) qualityScore = Math.min(qualityScore,69);
  const status: QualityResult['status'] = criticalFailures.length ? 'blocked' : qualityScore >= 90 ? 'ready' : qualityScore >= 80 ? 'minor' : qualityScore >= 70 ? 'auto-fix' : 'blocked';

  return {
    qualityScore,
    brandFidelityScore: Math.max(0,brandFidelity),
    readabilityScore: readability,
    strategicClarityScore: strategic,
    trustScore: Math.max(0,trust),
    status,
    criticalFailures,
    warnings
  };
}
