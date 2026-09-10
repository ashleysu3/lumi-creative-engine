import { describe, expect, it } from 'vitest';
import { generateCreativeSet } from '../src/index.js';

const baseBrand = {
  colors:{ primary:['#111111'], secondary:['#f2eee8'], accent:['#d86c70'], background:['#ffffff'], prohibited:[] },
  typography:{ headlineFamily:'Fraunces', bodyFamily:'Poppins', allowedWeights:[400,600,700], notes:[] },
  photography:{ founderLed:true, styleNotes:['natural editorial founder photography'], avoid:['generic stock photos'] },
  logoAssetIds:['logo-1'], motifs:['subtle hand-drawn underline'], avoid:['generic SaaS gradients']
};

it('prefers trust-building founder assets for a founder-led service brand', async () => {
  const output = await generateCreativeSet({
    requestId:'founder-test',
    offer:{ name:'Founder Offer', summary:'A strategic coaching offer that replaces random posting with a clear sales system.', offerType:'coaching', proof:[], claimsAllowed:[], claimsProhibited:[] },
    audience:{ description:'Business owners who are overwhelmed by content.', awarenessLevel:'problem aware', desires:['a calmer path to sales'], pains:['posting constantly without results'], objections:['I already tried a content plan'], customerLanguage:['I do not want to live on Instagram.'] },
    brand:baseBrand,
    mediaAssets:[
      { id:'founder-1', type:'image', founderPresent:true, faceVisible:true, tags:['founder','office','natural'], textOverlaySuitability:85, trustPotential:95 },
      { id:'desk-1', type:'image', founderPresent:false, faceVisible:false, tags:['desk'], textOverlaySuitability:90, trustPotential:45 }
    ],
    angles:[{ id:'angle-1', name:'Stop Feeding The Content Machine', coreThesis:'You do not need more posts; you need a system that turns the right message into sales.', customerTruth:'You are tired of doing more marketing just to feel behind.' }],
    requestedCreativeCount:8,
    preferredFormats:[], excludedFormats:[]
  });

  expect(output.concepts).toHaveLength(8);
  const founderUses = output.concepts.filter(c => c.mediaMatch.primaryAssetId === 'founder-1').length;
  expect(founderUses).toBeGreaterThanOrEqual(3);
  expect(output.concepts.every(c => !c.brief.mustInclude.some(x => /testimonial/i.test(x)))).toBe(true);
});

it('creates product-forward mix for SaaS', async () => {
  const output = await generateCreativeSet({
    requestId:'saas-test',
    offer:{ name:'Lumi', summary:'AI software for Meta advertisers that turns an offer into angles, hooks, creative strategy and production-ready ad concepts.', offerType:'SaaS software', uniqueMechanism:'Creative-led strategy built from the actual offer and buyer psychology.', proof:[], claimsAllowed:[], claimsProhibited:[] },
    audience:{ description:'Meta advertisers and business owners who struggle to know what ads to make.', awarenessLevel:'solution aware', desires:['better creative ideas'], pains:['generic AI outputs'], objections:['AI creative all looks the same'], customerLanguage:['What am I supposed to make ads about?'] },
    brand:{...baseBrand,photography:{...baseBrand.photography,founderLed:false}},
    mediaAssets:[{ id:'screen-1', type:'screenshot', founderPresent:false, faceVisible:false, tags:['dashboard','UI','product'], textOverlaySuitability:70, trustPotential:75 }],
    angles:[{ id:'angle-1', name:'From Offer To Creative Strategy', coreThesis:'Lumi turns your actual offer into strategic ad directions instead of generic idea lists.' }],
    requestedCreativeCount:10,
    preferredFormats:[], excludedFormats:[]
  });

  const formats = output.concepts.map(c=>c.route.format);
  expect(formats).toContain('annotated-screenshot');
  expect(formats).toContain('screen-recording');
  expect(output.concepts.some(c=>c.mediaMatch.primaryAssetId === 'screen-1')).toBe(true);
});

describe('safety rails', () => {
  it('never renders internal production labels as copy', async () => {
    const output = await generateCreativeSet({
      requestId:'labels-test',
      offer:{ name:'Offer', summary:'A simple service offer.', offerType:'service', proof:[], claimsAllowed:[], claimsProhibited:[] },
      audience:{ description:'Owners', desires:[], pains:[], objections:[], customerLanguage:[] },
      brand:baseBrand, mediaAssets:[],
      angles:[{ id:'a', name:'Clarity', coreThesis:'A clearer message creates an easier buying decision.' }],
      requestedCreativeCount:3, preferredFormats:['carousel'], excludedFormats:[]
    });
    for (const c of output.concepts) {
      expect(c.brief.headline).not.toMatch(/^(card|headline|hook|subhead|cta slide)/i);
      expect(c.qa.criticalFailures).toHaveLength(0);
    }
  });
});
