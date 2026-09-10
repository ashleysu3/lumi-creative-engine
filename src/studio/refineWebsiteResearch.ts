import { z } from 'zod';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { WebsiteResearchResult } from './websiteResearch.js';
import type { OfferProfile } from './profileSchemas.js';

const SynthesizedOfferSchema = z.object({
  name:z.string().min(2),
  url:z.string().optional(),
  offerType:z.string().optional(),
  summary:z.string().optional(),
  price:z.string().optional(),
  primaryPromise:z.string().optional(),
  uniqueMechanism:z.string().optional(),
  deliverables:z.array(z.string()).default([]),
  differentiators:z.array(z.string()).default([]),
  objections:z.array(z.string()).default([])
});

export const WebsiteResearchSynthesisSchema = z.object({
  clientName:z.string().optional(),
  industry:z.string().optional(),
  businessSummary:z.string().optional(),
  brandVoice:z.object({
    traits:z.array(z.string()).default([]),
    phrasesToUse:z.array(z.string()).default([]),
    writingNotes:z.array(z.string()).default([])
  }).optional(),
  audience:z.object({
    description:z.string().optional(),
    desires:z.array(z.string()).default([]),
    pains:z.array(z.string()).default([]),
    objections:z.array(z.string()).default([]),
    customerLanguage:z.array(z.string()).default([]),
    buyingTriggers:z.array(z.string()).default([]),
    anxieties:z.array(z.string()).default([])
  }).optional(),
  offer:SynthesizedOfferSchema.optional(),
  offers:z.array(SynthesizedOfferSchema).max(10).default([]),
  proofReview:z.array(z.object({
    text:z.string(),
    classification:z.enum(['likely-proof','example-or-demo','not-proof']),
    reason:z.string().default('')
  })).default([]),
  researchNotes:z.array(z.string()).default([])
});

export type WebsiteResearchSynthesis = z.infer<typeof WebsiteResearchSynthesisSchema>;

function compactResearchContext(result:WebsiteResearchResult) {
  return {
    rootUrl:result.rootUrl,
    pages:result.pages.slice(0,15).map(page=>({
      url:page.url,
      title:page.title,
      description:page.description,
      headings:page.headings.slice(0,22),
      paragraphs:page.paragraphs.slice(0,24),
      listItems:page.listItems.slice(0,20),
      questions:page.questions.slice(0,18),
      quotes:page.quotes.slice(0,15)
    })),
    exactLanguageCandidates:result.exactLanguageCandidates,
    proofCandidates:result.proofCandidates
  };
}

function key(text:string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function offerId(name:string,index:number) {
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,52);
  return `offer-${slug || index+1}`;
}

function sourceUrlAllowed(url:string|undefined,result:WebsiteResearchResult) {
  if (!url) return undefined;
  try {
    const normalized=new URL(url,result.rootUrl).toString();
    const allowed=new Set([result.rootUrl,...result.pages.map(page=>page.url)]);
    return allowed.has(normalized) ? normalized : undefined;
  } catch { return undefined; }
}

function buildOfferProfiles(synthesis:WebsiteResearchSynthesis,result:WebsiteResearchResult):OfferProfile[] {
  const rawOffers=synthesis.offers.length ? synthesis.offers : (synthesis.offer ? [synthesis.offer] : []);
  const seen=new Set<string>();
  return rawOffers.filter(item=>{
    const k=key(item.name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((item,index)=>{
    const url=sourceUrlAllowed(item.url,result);
    const relatedProofIds=result.profileDraft.proofLibrary
      .filter(proof=>!url || !proof.source || proof.source===url)
      .map(proof=>proof.id);
    return {
      id:offerId(item.name,index),
      name:item.name,
      url:url ?? result.rootUrl,
      offerType:item.offerType ?? 'unknown',
      summary:item.summary ?? '',
      price:item.price,
      primaryPromise:item.primaryPromise,
      uniqueMechanism:item.uniqueMechanism,
      deliverables:item.deliverables,
      differentiators:item.differentiators,
      objections:item.objections,
      proofItemIds:relatedProofIds,
      claimsAllowed:[],
      claimsProhibited:[]
    };
  }).filter(offer=>offer.summary.length>=12 || offer.primaryPromise || offer.deliverables.length);
}

export async function refineWebsiteResearchWithModel(result:WebsiteResearchResult,provider:ModelProvider):Promise<WebsiteResearchResult> {
  const raw = await provider.generate<ReturnType<typeof compactResearchContext>,unknown>({
    task:'website-research',
    input:compactResearchContext(result),
    system:`You are the senior client-research strategist for a Meta ads agency. Turn the supplied public website evidence into a precise client creative profile draft.

Rules:
- Use ONLY the supplied page content. Never invent products, customers, results, testimonials, prices, proof, claims, or positioning.
- Prefer specific source-grounded language over generic marketing phrasing.
- Customer-language entries must be exact or near-exact language actually present in supplied quotes, FAQs, headings, or page copy.
- If a field is not supported by the source, omit it or return an empty array. Do not guess.
- Separate audience pain from desired outcomes and from objections.
- For uniqueMechanism, only state a mechanism if the source explains why/how the offer works differently.
- IMPORTANT: websites often contain MULTIPLE OFFERS. Never blend a freebie, course, mastermind, coaching offer, shop product, membership, and lead magnet into one fake composite offer. Return each materially distinct offer separately in offers[].
- Each offer should be grounded in one specific source page whenever possible. Include its exact supplied page URL in offer.url. Do not invent URLs.
- Ignore navigation labels such as Shop, Freebies, Blog, Resources, Learn More, or Book Now as standalone offers unless the page content clearly establishes a specific purchasable/opt-in offer.
- Be especially careful with pages that SHOW EXAMPLE ADS, DEMO COPY, mock dashboards, sample testimonials, template content, fictional customers, or illustrative metrics. Those examples describe what the product can create; they are NOT automatically proof about the business itself.
- Review every supplied proofCandidates item. Classify it as likely-proof, example-or-demo, or not-proof. A likely-proof item must read as an actual factual result, customer testimonial, credential, adoption metric, or case-study claim about this business/offer — not a sample ad being displayed on the page.
- Never approve proof for advertising; this classification only decides whether it belongs in the human-review queue.
- Return JSON only with these optional keys: clientName, industry, businessSummary, brandVoice, audience, offers, proofReview, researchNotes.
- brandVoice may contain traits, phrasesToUse, writingNotes.
- audience may contain description, desires, pains, objections, customerLanguage, buyingTriggers, anxieties.
- offers is an array; each item may contain name, url, offerType, summary, price, primaryPromise, uniqueMechanism, deliverables, differentiators, objections.
- proofReview is an array of {text, classification, reason}; use the candidate text exactly so it can be matched back to the source evidence.`
  });

  const synthesis = WebsiteResearchSynthesisSchema.parse(raw);
  const profile = result.profileDraft;
  if (synthesis.clientName) profile.clientName=synthesis.clientName;
  if (synthesis.industry) profile.industry=synthesis.industry;
  if (synthesis.businessSummary) profile.businessSummary=synthesis.businessSummary;
  if (synthesis.brandVoice) {
    profile.brandVoice.traits=synthesis.brandVoice.traits;
    profile.brandVoice.phrasesToUse=synthesis.brandVoice.phrasesToUse;
    profile.brandVoice.writingNotes=[...profile.brandVoice.writingNotes,...synthesis.brandVoice.writingNotes];
  }
  const audience = profile.audiences[0];
  if (audience && synthesis.audience) {
    if (synthesis.audience.description) audience.description=synthesis.audience.description;
    audience.desires=synthesis.audience.desires;
    audience.pains=synthesis.audience.pains;
    audience.objections=synthesis.audience.objections;
    audience.customerLanguage=synthesis.audience.customerLanguage;
    audience.buyingTriggers=synthesis.audience.buyingTriggers;
    audience.anxieties=synthesis.audience.anxieties;
  }

  const synthesizedOffers=buildOfferProfiles(synthesis,result);
  if (synthesizedOffers.length) profile.offers=synthesizedOffers;

  if (synthesis.proofReview.length) {
    const likely=new Set(synthesis.proofReview.filter(item=>item.classification==='likely-proof').map(item=>key(item.text)));
    const excluded=synthesis.proofReview.filter(item=>item.classification!=='likely-proof');
    result.proofCandidates=result.proofCandidates.filter(text=>likely.has(key(text)));
    profile.proofLibrary=profile.proofLibrary.filter(item=>likely.has(key(item.text)));
    for (const offer of profile.offers) {
      const validIds=new Set(profile.proofLibrary.map(item=>item.id));
      offer.proofItemIds=offer.proofItemIds.filter(id=>validIds.has(id));
    }
    if (excluded.length) profile.sourceNotes.push(`AI proof review excluded ${excluded.length} candidate${excluded.length===1?'':'s'} as demo/example or non-proof content.`);
  }

  profile.sourceNotes=[...profile.sourceNotes,...synthesis.researchNotes,'Semantic website synthesis completed with configured model provider.'];
  return result;
}
