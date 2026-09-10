import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../schemas/index.js';
import type { MediaMatch, QualityResult } from '../types/internal.js';
import { semanticQA } from './semanticQA.js';

export function qualityCheck(input: CreativeEngineInput, route: CreativeRoute, brief: CreativeBrief, media: MediaMatch): QualityResult {
  const semantic = semanticQA(brief);
  const criticalFailures = [...semantic.criticalFailures];
  const warnings = [...semantic.warnings, ...media.warnings];

  let brandFidelity = 88;
  if (input.brand.typography.headlineFamily && brief.brandAdaptation.headlineFont !== input.brand.typography.headlineFamily) {
    brandFidelity -= 25;
    criticalFailures.push('Headline font does not match the approved brand font.');
  }
  if (brief.brandAdaptation.colors.some(c => input.brand.colors.prohibited.includes(c))) {
    brandFidelity -= 30;
    criticalFailures.push('A prohibited brand color was selected.');
  }

  let trust = 76;
  if (input.brand.photography.founderLed) {
    const chosen = input.mediaAssets.find(a => a.id === media.primaryAssetId);
    if (chosen?.founderPresent && chosen.faceVisible) trust = 95;
    else if (input.mediaAssets.some(a => a.founderPresent && a.faceVisible) && !route.format.startsWith('screen-recording') && route.format !== 'annotated-screenshot') {
      trust = 62;
      warnings.push('Founder-led brand has a strong founder asset available but this concept does not use it.');
    }
  }

  const strategic = Math.round((route.scores.strategicClarity + route.scores.relevance + route.scores.specificity) / 3);
  const readability = brief.headline.length <= 90 ? 92 : brief.headline.length <= 130 ? 80 : 68;
  if (readability < 70) warnings.push('Headline may be too long for fast mobile comprehension.');
  const qualityScore = Math.round((brandFidelity + trust + strategic + readability) / 4);
  const status: QualityResult['status'] = criticalFailures.length ? 'blocked' : qualityScore >= 90 ? 'ready' : qualityScore >= 80 ? 'minor' : qualityScore >= 70 ? 'auto-fix' : 'blocked';

  return {
    qualityScore,
    brandFidelityScore: Math.max(0,brandFidelity),
    readabilityScore: readability,
    strategicClarityScore: strategic,
    trustScore: trust,
    status,
    criticalFailures,
    warnings
  };
}
