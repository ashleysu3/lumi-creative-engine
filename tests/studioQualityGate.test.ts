import { describe, expect, it } from 'vitest';
import { handleAgencyStudioGenerate } from '../src/api/studioHttp.js';

function body(sourceNotes:string[]=[]){
  return {
    profile:{
      id:'client',clientName:'Client',website:'https://example.com',industry:'education',businessSummary:'A founder-led education business with a clear paid offer for established service providers.',
      brandVoice:{traits:['direct'],phrasesToUse:[],phrasesToAvoid:[],writingNotes:[]},
      brand:{colors:{primary:['#111111'],secondary:[],accent:[],background:['#ffffff'],prohibited:[]},typography:{allowedWeights:[],notes:[]},photography:{founderLed:true,styleNotes:[],avoid:[]},logoAssetIds:[],motifs:[],avoid:[],layout:{density:'balanced',personality:[]}},
      audiences:[{id:'audience-primary',name:'Primary',description:'Established service providers who need a clearer client acquisition system.',awarenessLevel:'solution aware',desires:['clarity'],pains:['inconsistent leads'],objections:[],customerLanguage:[],identitySignals:[],buyingTriggers:[],anxieties:[]}],
      offers:[{id:'offer-primary',name:'Growth Program',url:'https://example.com/program',offerType:'program',summary:'A structured program for service providers building a repeatable client acquisition system.',deliverables:[],differentiators:[],objections:[],proofItemIds:[],claimsAllowed:[],claimsProhibited:[]}],
      proofLibrary:[],competitors:[],creativeLearning:{winningAngles:[],losingAngles:[],winningHooks:[],fatiguedHooks:[],winningFormats:[],weakFormats:[],founderNotes:[],visualNotes:[],audienceLearnings:[],performanceNotes:[]},globalConstraints:[],mediaAssets:[],sourceLinks:[],sourceNotes
    },
    campaign:{id:'campaign',name:'Batch',offerId:'offer-primary',audienceId:'audience-primary',objective:'sales',audienceTemperature:'cold',campaignNotes:[],desiredCreativeCount:1,preferredFormats:[],excludedFormats:[],deliveryMix:{staticAds:1,brollAds:0,talkingHeadScripts:0,carousels:0},newProof:[],creativeDirectionNotes:[]},
    sessionMedia:[]
  };
}

describe('agency studio quality gates',()=>{
  it('refuses to create client deliverables in deterministic mode',async()=>{
    const response=await handleAgencyStudioGenerate(body());
    expect(response.status).toBe(503);
    expect(response.body).toContain('ai_required_for_agency_generation');
  });

  it('refuses a source-only website research draft even when a model is available',async()=>{
    const provider={generate:async()=>({}) as never};
    const response=await handleAgencyStudioGenerate(body(['Website research draft generated from 8 public pages.','Research cleanup applied: boilerplate removed.']),{modelProvider:provider});
    expect(response.status).toBe(422);
    expect(response.body).toContain('client_profile_needs_semantic_research');
  });
});
