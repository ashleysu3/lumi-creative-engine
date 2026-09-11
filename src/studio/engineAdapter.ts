import type { CreativeEngineInput, MediaAsset } from '../schemas/index.js';
import { ClientCreativeProfileSchema, CampaignBriefSchema, type CampaignBrief, type ClientCreativeProfile } from './profileSchemas.js';

function clean(values:Array<string|undefined|null>):string[] {
  return values.map(v=>v?.trim()).filter((v):v is string=>Boolean(v));
}

function proofForOffer(profile:ClientCreativeProfile,offerId:string,campaign:CampaignBrief):string[] {
  const offer = profile.offers.find(item=>item.id===offerId);
  const ids = new Set(offer?.proofItemIds ?? []);
  const approved = profile.proofLibrary
    .filter(item=>ids.has(item.id) && item.verified && item.approvedForAds)
    .map(item=>item.text);
  return [...approved,...campaign.newProof];
}

function buildAngles(profile:ClientCreativeProfile,campaign:CampaignBrief) {
  const offer = profile.offers.find(item=>item.id===campaign.offerId)!;
  const audience = profile.audiences.find(item=>item.id===campaign.audienceId)!;
  const angles:Array<{id:string;name:string;coreThesis:string;customerTruth?:string;desiredShift?:string}> = [];

  if (offer.primaryPromise) angles.push({
    id:'agency-promise',
    name:'The Desired Outcome',
    coreThesis:offer.primaryPromise,
    customerTruth:audience.desires[0],
    desiredShift:`From ${audience.pains[0] ?? 'the current frustration'} to ${offer.primaryPromise}`
  });

  if (audience.pains[0]) angles.push({
    id:'agency-pain',
    name:'The Cost of the Current Way',
    coreThesis:`The current approach keeps creating ${audience.pains[0]}. ${offer.name} offers a more useful path.`,
    customerTruth:audience.customerLanguage[0] ?? audience.pains[0],
    desiredShift:offer.primaryPromise
  });

  const objection = campaign.campaignNotes.find(note=>/^objection:/i.test(note))?.replace(/^objection:\s*/i,'') ?? audience.objections[0] ?? offer.objections[0];
  if (objection) angles.push({
    id:'agency-objection',
    name:'The Objection',
    coreThesis:`Address the belief “${objection}” directly without overexplaining or becoming defensive.`,
    customerTruth:objection,
    desiredShift:`Make the next step feel credible, specific, and lower-risk.`
  });

  if (offer.uniqueMechanism) angles.push({
    id:'agency-mechanism',
    name:'Why This Works Differently',
    coreThesis:offer.uniqueMechanism,
    customerTruth:offer.differentiators[0] ?? audience.customerLanguage[1],
    desiredShift:'Move the buyer from category-level interest to preference for this specific mechanism.'
  });

  const learning = profile.creativeLearning.winningAngles[0];
  if (learning) angles.push({
    id:'agency-proven-angle',
    name:'Proven Direction',
    coreThesis:learning,
    customerTruth:profile.creativeLearning.audienceLearnings[0],
    desiredShift:'Build on a direction that has already shown promise without repeating the exact same ad.'
  });

  if (campaign.keyMessage) angles.unshift({
    id:'agency-campaign-message',
    name:'Campaign Priority',
    coreThesis:campaign.keyMessage,
    customerTruth:audience.customerLanguage[0],
    desiredShift:offer.primaryPromise
  });

  const unique = new Map(angles.map(angle=>[angle.coreThesis.toLowerCase(),angle]));
  return [...unique.values()].slice(0,6);
}

function deliveryTargets(campaign:CampaignBrief):CreativeEngineInput['formatTargets'] {
  const targets:NonNullable<CreativeEngineInput['formatTargets']> = {} as NonNullable<CreativeEngineInput['formatTargets']>;
  const set = (format:keyof NonNullable<CreativeEngineInput['formatTargets']>,count:number) => { if(count>0) targets[format]=count; };
  const mix = campaign.deliveryMix;

  if (mix.staticAds > 0) {
    const editorial = Math.ceil(mix.staticAds/2);
    set('editorial-static',editorial);
    set('designed-static',mix.staticAds-editorial);
  }
  if (mix.brollAds > 0) {
    const voice = Math.ceil(mix.brollAds/2);
    set('broll-voiceover',voice);
    set('broll-text',mix.brollAds-voice);
  }
  if (mix.talkingHeadScripts > 0) {
    const captioned = Math.floor(mix.talkingHeadScripts/2);
    set('talking-head-captions',captioned);
    set('talking-head',mix.talkingHeadScripts-captioned);
  }
  if (mix.carousels > 0) {
    const comparison = Math.floor(mix.carousels/2);
    set('comparison-carousel',comparison);
    set('carousel',mix.carousels-comparison);
  }
  return targets;
}

export function buildCreativeEngineInput(
  rawProfile:ClientCreativeProfile,
  rawCampaign:CampaignBrief,
  sessionMedia:MediaAsset[]=[]
):CreativeEngineInput {
  const profile = ClientCreativeProfileSchema.parse(rawProfile);
  const campaign = CampaignBriefSchema.parse(rawCampaign);
  const offer = profile.offers.find(item=>item.id===campaign.offerId);
  const audience = profile.audiences.find(item=>item.id===campaign.audienceId);
  if (!offer) throw new Error(`Offer ${campaign.offerId} was not found in the client profile.`);
  if (!audience) throw new Error(`Audience ${campaign.audienceId} was not found in the client profile.`);

  const claimsProhibited = clean([
    ...offer.claimsProhibited,
    ...profile.globalConstraints,
    ...profile.brandVoice.phrasesToAvoid
  ]);
  const claimsAllowed = clean([
    ...offer.claimsAllowed,
    ...offer.differentiators
  ]);

  const requestedByMix = Object.values(campaign.deliveryMix).reduce((sum,count)=>sum+count,0);
  const requestedCreativeCount = requestedByMix > 0 ? requestedByMix : campaign.desiredCreativeCount;

  return {
    requestId:`agency-${profile.id}-${campaign.id}-${Date.now()}`,
    offer:{
      name:offer.name,
      url:campaign.destinationUrl ?? offer.url ?? profile.website,
      summary:clean([offer.summary,offer.primaryPromise,campaign.promotion,...offer.deliverables]).join(' '),
      offerType:offer.offerType,
      uniqueMechanism:offer.uniqueMechanism,
      proof:proofForOffer(profile,offer.id,campaign),
      claimsAllowed,
      claimsProhibited
    },
    audience:{
      description:audience.description,
      awarenessLevel:audience.awarenessLevel,
      desires:clean([...audience.desires,...audience.buyingTriggers]),
      pains:clean([...audience.pains,...audience.anxieties]),
      objections:clean([...audience.objections,...offer.objections]),
      customerLanguage:audience.customerLanguage
    },
    brand:{
      ...profile.brand,
      typography:{
        ...profile.brand.typography,
        notes:clean([...profile.brand.typography.notes,...profile.brandVoice.writingNotes])
      },
      approvedExamples:clean([...(profile.brand.approvedExamples ?? []),...profile.creativeLearning.winningFormats]),
      avoidExamples:clean([...(profile.brand.avoidExamples ?? []),...profile.creativeLearning.weakFormats]),
      avoid:clean([...profile.brand.avoid,...profile.brandVoice.phrasesToAvoid,...profile.globalConstraints])
    },
    mediaAssets:[...profile.mediaAssets,...sessionMedia],
    angles:buildAngles(profile,campaign),
    requestedCreativeCount,
    preferredFormats:campaign.preferredFormats,
    excludedFormats:campaign.excludedFormats,
    formatTargets:deliveryTargets(campaign)
  };
}
