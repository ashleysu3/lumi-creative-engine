import { describe, expect, it } from 'vitest';
import { researchWebsite } from '../src/studio/websiteResearch.js';
import { refineWebsiteResearchWithModel } from '../src/studio/refineWebsiteResearch.js';
import type { ModelProvider } from '../src/providers/modelProvider.js';

describe('model-assisted website research',()=>{
  it('improves semantic fields while leaving proof unapproved',async()=>{
    const html=`<html><head><title>Founder Co</title><meta name="description" content="Messaging strategy for creative founders"></head><body><h1>Stop guessing what to say</h1><p>We help creative founders turn scattered ideas into a clear messaging system.</p><blockquote>“I finally know what to say.”</blockquote><p>Over 100 clients have used the program.</p></body></html>`;
    const fetchImpl=async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}});
    const research=await researchWebsite({url:'https://founder.example/',maxPages:1,fetchImpl});
    const provider:ModelProvider={
      async generate(){return {
        clientName:'Founder Co',industry:'marketing education',businessSummary:'Messaging strategy for creative founders who need a clearer system.',
        brandVoice:{traits:['direct','clear'],phrasesToUse:['Stop guessing what to say'],writingNotes:['Lead with clarity over hype.']},
        audience:{description:'Creative founders with scattered messaging.',desires:['a clear messaging system'],pains:['guessing what to say'],objections:[],customerLanguage:['I finally know what to say.'],buyingTriggers:['clarity'],anxieties:[]},
        offer:{name:'Messaging Program',offerType:'program',summary:'A program that turns scattered ideas into a clear messaging system.',primaryPromise:'Stop guessing what to say',deliverables:[],differentiators:[],objections:[]},
        researchNotes:['Synthesized only from supplied website copy.']
      } as never;}
    };
    const refined=await refineWebsiteResearchWithModel(research,provider);
    expect(refined.profileDraft.industry).toBe('marketing education');
    expect(refined.profileDraft.audiences[0].pains).toContain('guessing what to say');
    expect(refined.profileDraft.brandVoice.traits).toContain('direct');
    expect(refined.profileDraft.proofLibrary.length).toBeGreaterThan(0);
    expect(refined.profileDraft.proofLibrary.every(x=>!x.verified&&!x.approvedForAds)).toBe(true);
  });
});
