import { archetypes, type Archetype } from '../libraries/archetypes.js';
import type { CreativeEngineInput } from '../schemas/index.js';

export type ArchetypeScore = { archetype: Archetype; score: number; reasons: string[] };

const founderHeavy = new Set(['founder-confession','founder-story','identity-callout','pov','ugc-overlay','micro-moment','big-editorial-headline']);
const saasHeavy = new Set(['annotated-screenshot','how-it-works','feature-to-benefit','one-big-benefit','comparison-chart','result-dashboard','old-way-new-way']);
const proofHeavy = new Set(['proof-first','customer-quote','statistic-led','result-dashboard','before-after']);
const objectionHeavy = new Set(['objection-crusher','myth-vs-reality','you-dont-need-x','contrarian-belief','comparison-chart']);
const educationHeavy = new Set(['three-mistakes','mini-framework','checklist','timeline-process','how-it-works','myth-vs-reality']);

function norm(v: string) { return v.toLowerCase(); }

export function scoreArchetypes(input: CreativeEngineInput, angleId: string): ArchetypeScore[] {
  const angle = input.angles.find(a => a.id === angleId) ?? input.angles[0];
  const text = norm([input.offer.offerType,input.offer.summary,input.offer.uniqueMechanism ?? '',angle?.coreThesis ?? '',input.audience.description,...input.audience.objections,...input.audience.pains].join(' '));
  const founder = input.brand.photography.founderLed || input.mediaAssets.some(a => a.founderPresent);
  const isSaas = /saas|software|app|platform|tool|dashboard|ai /.test(text);
  const hasProof = input.offer.proof.length > 0;
  const hasObjections = input.audience.objections.length > 0;

  return archetypes.map(archetype => {
    let score = 45;
    const reasons: string[] = [];
    if (founder && founderHeavy.has(archetype.id)) { score += 18; reasons.push('strong founder/trust fit'); }
    if (isSaas && saasHeavy.has(archetype.id)) { score += 20; reasons.push('strong product-mechanism fit'); }
    if (hasProof && proofHeavy.has(archetype.id)) { score += 14; reasons.push('verified proof available'); }
    if (hasObjections && objectionHeavy.has(archetype.id)) { score += 12; reasons.push('maps to known objections'); }
    if ((input.audience.awarenessLevel ?? '').toLowerCase().includes('problem') && educationHeavy.has(archetype.id)) { score += 10; reasons.push('fits awareness level'); }
    if (/different|instead|old|new|better way|without/.test(text) && ['old-way-new-way','comparison-chart','you-dont-need-x','contrarian-belief'].includes(archetype.id)) { score += 10; reasons.push('fits contrast-driven angle'); }
    if (/how|process|system|method|framework|works/.test(text) && ['how-it-works','mini-framework','timeline-process','feature-to-benefit'].includes(archetype.id)) { score += 9; reasons.push('fits mechanism/process story'); }
    score = Math.max(0, Math.min(100, score));
    return { archetype, score, reasons };
  }).sort((a,b) => b.score - a.score);
}
