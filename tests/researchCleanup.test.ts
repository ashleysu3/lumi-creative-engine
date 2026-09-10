import { describe, expect, it } from 'vitest';
import { cleanupWebsiteResearch } from '../src/studio/researchCleanup.js';

describe('research cleanup',()=>{
  it('suppresses boilerplate and generic keyword matches while keeping concise evidence',()=>{
    const result:any={
      rootUrl:'https://example.com/',
      pages:[{
        url:'https://example.com/',title:'Example Co',description:'Helping service businesses turn scattered marketing into a clear paid-social strategy.',
        headings:['Stop guessing what to make','Privacy Policy','Get Started'],
        paragraphs:[
          'If you are overwhelmed by random content and tired of guessing what to make, the process gives you a clearer plan.',
          'Our clients use the platform to create campaigns and marketing content. Learn more about our services and contact us today.',
          'More than 250 clients have completed the strategy process.',
          'Copyright 2026 Example Co. All rights reserved.'
        ],
        listItems:['Creative strategy','Campaign plan','Learn more','Contact us'],
        questions:['Do I need a huge audience?','How much time does this take?'],
        quotes:['“I finally know what to say without staring at a blank page.”'],
        colors:['#111111','#ffffff'],fonts:['DM Sans'],socialLinks:[],internalLinks:[]
      }],
      discoveredSocialLinks:[],
      proofCandidates:[
        'Our clients use the platform to create campaigns and marketing content. Learn more about our services and contact us today.',
        'More than 250 clients have completed the strategy process.'
      ],
      exactLanguageCandidates:['“I finally know what to say without staring at a blank page.”','Privacy Policy'],
      colors:['#111111','#ffffff'],fonts:['DM Sans'],warnings:[],
      profileDraft:{
        id:'example',clientName:'Example Co',website:'https://example.com/',businessSummary:'Helping service businesses turn scattered marketing into a clear paid-social strategy.',
        brandVoice:{traits:[],phrasesToUse:['Stop guessing what to make','Privacy Policy'],phrasesToAvoid:[],writingNotes:[]},
        brand:{colors:{primary:['#111111'],secondary:[],accent:[],background:['#ffffff'],prohibited:[]},typography:{allowedWeights:[],notes:[]},photography:{founderLed:false,styleNotes:[],avoid:[]},logoAssetIds:[],motifs:[],avoid:[],layout:{density:'balanced',personality:[]}},
        audiences:[{id:'audience-primary',name:'Primary audience',description:'People described by the website as everybody who wants better marketing and a lot of things that should not be inferred from one sentence on the page.',awarenessLevel:'solution aware',desires:['create campaigns and marketing content'],pains:['overwhelmed by random content and tired of guessing what to make'],objections:['Do I need a huge audience?'],customerLanguage:['“I finally know what to say without staring at a blank page.”'],identitySignals:[],buyingTriggers:[],anxieties:[]}],
        offers:[{id:'offer-primary',name:'Example Co',url:'https://example.com/',offerType:'unknown',summary:'Helping service businesses turn scattered marketing into a clear paid-social strategy.',deliverables:['Creative strategy','Campaign plan','Learn more','Contact us'],differentiators:[],objections:[],proofItemIds:[],claimsAllowed:[],claimsProhibited:[]}],
        proofLibrary:[],competitors:[],creativeLearning:{winningAngles:[],losingAngles:[],winningHooks:[],fatiguedHooks:[],winningFormats:[],weakFormats:[],founderNotes:[],visualNotes:[],audienceLearnings:[],performanceNotes:[]},globalConstraints:[],mediaAssets:[],sourceLinks:[],sourceNotes:[]
      }
    };

    const cleaned=cleanupWebsiteResearch(result);
    expect(cleaned.proofCandidates).toEqual(['More than 250 clients have completed the strategy process.']);
    expect(cleaned.exactLanguageCandidates.join(' ')).toContain('blank page');
    expect(cleaned.exactLanguageCandidates.join(' ')).not.toMatch(/privacy policy/i);
    expect(cleaned.profileDraft.offers[0].deliverables).toEqual(['Creative strategy','Campaign plan']);
    expect(cleaned.profileDraft.audiences[0].pains.some((x:string)=>/overwhelmed|guessing/i.test(x))).toBe(true);
    expect(cleaned.profileDraft.brandVoice.phrasesToUse).toEqual(['Stop guessing what to make']);
    expect(cleaned.profileDraft.proofLibrary[0].approvedForAds).toBe(false);
  });
});
