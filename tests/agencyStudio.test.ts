import { describe, expect, it } from 'vitest';
import { buildCreativeEngineInput } from '../src/studio/engineAdapter.js';
import { buildAgencyDeliveryPack } from '../src/studio/deliverables.js';
import { generateCreativeSet } from '../src/index.js';
import type { CampaignBrief, ClientCreativeProfile } from '../src/studio/profileSchemas.js';

const profile:ClientCreativeProfile = {
  id:'client-1',clientName:'Client One',website:'https://example.com',industry:'coaching',businessSummary:'Founder-led coaching business.',
  brandVoice:{traits:['direct'],phrasesToUse:[],phrasesToAvoid:['guaranteed'],writingNotes:['plain language']},
  brand:{colors:{primary:['#111111'],secondary:['#f2eee8'],accent:['#d977a8'],background:['#ffffff'],prohibited:[]},typography:{headlineFamily:'Georgia',bodyFamily:'Inter',allowedWeights:[400,700],notes:[]},photography:{founderLed:true,styleNotes:['real founder'],avoid:['generic stock']},logoAssetIds:[],motifs:[],avoid:[]},
  audiences:[{id:'audience-primary',name:'Primary',description:'Business owners who are overwhelmed by marketing.',awarenessLevel:'solution aware',desires:['clarity'],pains:['random content'],objections:['I can do this myself'],customerLanguage:['I do not know what to make.'],identitySignals:[],buyingTriggers:['clear plan'],anxieties:['wasting money']}],
  offers:[{id:'offer-primary',name:'Creative Intensive',url:'https://example.com/offer',offerType:'coaching service',summary:'Creative strategy intensive.',primaryPromise:'Know exactly what creative to make.',uniqueMechanism:'Starts with offer and buyer psychology.',deliverables:['angles','scripts'],differentiators:['strategy first'],objections:[],proofItemIds:['proof-ok','proof-no'],claimsAllowed:['Includes a strategy session'],claimsProhibited:['guaranteed ROAS']}],
  proofLibrary:[
    {id:'proof-ok',type:'metric',text:'80% of clients complete the strategy session.',verified:true,approvedForAds:true},
    {id:'proof-no',type:'testimonial',text:'Unapproved testimonial.',verified:true,approvedForAds:false}
  ],
  competitors:[],creativeLearning:{winningAngles:['Specificity beats volume.'],losingAngles:[],winningHooks:[],fatiguedHooks:[],winningFormats:['founder editorial'],weakFormats:[],founderNotes:[],visualNotes:[],audienceLearnings:['Relief converts better than hype.'],performanceNotes:[]},globalConstraints:['No income promises'],mediaAssets:[],sourceNotes:[]
};

const campaign:CampaignBrief = {
  id:'campaign-1',name:'September batch',offerId:'offer-primary',audienceId:'audience-primary',objective:'sales',audienceTemperature:'cold',campaignNotes:[],desiredCreativeCount:5,preferredFormats:[],excludedFormats:[],deliveryMix:{staticAds:2,brollAds:1,talkingHeadScripts:1,carousels:1},newProof:[],creativeDirectionNotes:[]
};

describe('agency studio input adapter',()=>{
  it('uses only verified approved proof and carries client constraints into the engine',()=>{
    const input=buildCreativeEngineInput(profile,campaign);
    expect(input.offer.proof).toContain('80% of clients complete the strategy session.');
    expect(input.offer.proof).not.toContain('Unapproved testimonial.');
    expect(input.offer.claimsProhibited).toContain('No income promises');
    expect(input.requestedCreativeCount).toBe(5);
    expect(input.angles.length).toBeGreaterThanOrEqual(3);
  });

  it('turns the requested agency delivery mix into exact format targets',()=>{
    const input=buildCreativeEngineInput(profile,campaign);
    const total=Object.values(input.formatTargets ?? {}).reduce((sum,count)=>sum+count,0);
    expect(total).toBe(5);
    expect((input.formatTargets?.['talking-head'] ?? 0)+(input.formatTargets?.['talking-head-captions'] ?? 0)).toBe(1);
    expect((input.formatTargets?.['broll-voiceover'] ?? 0)+(input.formatTargets?.['broll-text'] ?? 0)).toBe(1);
    expect((input.formatTargets?.carousel ?? 0)+(input.formatTargets?.['comparison-carousel'] ?? 0)).toBe(1);
  });
});

describe('agency delivery packaging',()=>{
  it('returns client-handoff categories for the requested production mix',async()=>{
    const input=buildCreativeEngineInput(profile,campaign);
    const output=await generateCreativeSet(input);
    const pack=buildAgencyDeliveryPack(output);
    expect(pack.staticAds).toHaveLength(2);
    expect(pack.brollAds).toHaveLength(1);
    expect(pack.talkingHeadScripts).toHaveLength(1);
    expect(pack.carousels).toHaveLength(1);
    expect(pack.talkingHeadScripts[0].fullScript.length).toBeGreaterThan(20);
    expect(pack.brollAds[0].shotSequence.length).toBeGreaterThanOrEqual(3);
  });
});
