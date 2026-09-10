import { describe, expect, it } from 'vitest';
import { compileCreativeOutput } from '../src/rendering/compileCreativeOutput.js';
import { batchRedundancyCheck } from '../src/strategy/batchRedundancyCheck.js';
import { autoFixAndRecheck } from '../src/rendering/autoFix.js';
import type { CreativeBrief, CreativeRoute } from '../src/schemas/index.js';
import type { MediaMatch } from '../src/types/internal.js';

const baseRoute: CreativeRoute = {
  id:'r1', angleId:'a1', archetypeId:'founder-confession', format:'designed-static', productionTreatmentId:'raw-iphone', styleId:'editorial',
  conceptName:'Founder truth', singleBigIdea:'The problem is not more content. It is better ad strategy.', primaryHook:'You do not need more content.', visualSummary:'Founder portrait with strong negative space.', whyItFits:'Trust-led offer.',
  scores:{ strategicClarity:90, visualStopPower:88, relevance:92, specificity:86, glanceComprehension:91 }
};
const brief: CreativeBrief = {
  routeId:'r1', headline:'You do not need more content.', supportingCopy:'You need better reasons for people to care.', cta:'See how it works', visualConcept:'Natural founder portrait in a real workspace.', composition:'Founder on right, text-safe negative space on left.', focalPoint:'Founder face', mustInclude:[], mustAvoid:['generic SaaS dashboard'], brandAdaptation:{ colors:['#111111','#f4efe8'], headlineFont:'Fraunces', bodyFont:'Inter', motifs:[] }
};
const media: MediaMatch = { source:'uploaded', primaryAssetId:'img-1', score:91, reason:'founder present', backupAssetIds:[], warnings:[], selectedSegmentIds:[], preserveAuthenticity:true };

describe('render compiler', () => {
  it('keeps generated static scenes text-free and overlays copy separately', () => {
    const plan = compileCreativeOutput(baseRoute, brief, media);
    expect(plan.kind).toBe('static');
    if (plan.kind !== 'static') return;
    expect(plan.mode).toBe('scene-only');
    expect(plan.scenePrompt).toContain('supplied real asset');
    expect(plan.negativePrompt.join(' ')).toMatch(/No text/i);
    expect(plan.overlays.map(o => o.text)).toContain(brief.headline);
  });

  it('never renders internal carousel production labels', () => {
    const plan = compileCreativeOutput({ ...baseRoute, format:'carousel' }, { ...brief, headline:'Headline: this should never leak' }, media);
    expect(plan.kind).toBe('carousel');
    if (plan.kind !== 'carousel') return;
    expect(JSON.stringify(plan.slides)).not.toContain('Headline: this should never leak');
    expect(plan.slides[0].headline).toBe(baseRoute.primaryHook);
  });
});

describe('batch redundancy', () => {
  it('flags repeated hooks', () => {
    const routes = [baseRoute, { ...baseRoute, id:'r2', archetypeId:'problem-solution', format:'talking-head' as const }];
    expect(batchRedundancyCheck(routes).some(i => i.dimension === 'hook')).toBe(true);
  });
});

describe('visual QA auto-fix', () => {
  it('rechecks deterministic fixes and stops when ready', async () => {
    const initial = { visualQaScore:65, status:'auto-fix' as const, issues:[{ code:'cta-collision' as const, severity:'warning' as const, message:'CTA too close to edge', recommendedFix:'Move CTA up', autoFixable:true }], criticalFailures:[], recommendedFixes:['Move CTA up'], autoFixable:true, attempts:0 };
    const result = await autoFixAndRecheck({
      initialQa:initial,
      visualInput:{ flattenedAssetUrl:'https://example.com/a.png', width:1080, height:1350 },
      render:async (_actions, attempt) => ({ flattenedAssetUrl:`https://example.com/a-${attempt}.png`, width:1080, height:1350 }),
      inspect:async () => ({ visualQaScore:94, status:'ready', issues:[], criticalFailures:[], recommendedFixes:[], autoFixable:false, attempts:1 })
    });
    expect(result.finalQa.status).toBe('ready');
    expect(result.attempts).toHaveLength(1);
  });
});
