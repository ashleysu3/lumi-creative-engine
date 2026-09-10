import { z } from 'zod';
import type { ModelProvider } from '../providers/modelProvider.js';
import type { WebsiteResearchResult } from './websiteResearch.js';

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
  offer:z.object({
    name:z.string().optional(),
    offerType:z.string().optional(),
    summary:z.string().optional(),
    primaryPromise:z.string().optional(),
    uniqueMechanism:z.string().optional(),
    deliverables:z.array(z.string()).default([]),
    differentiators:z.array(z.string()).default([]),
    objections:z.array(z.string()).default([])
  }).optional(),
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
    pages:result.pages.slice(0,12).map(page=>({
      url:page.url,
      title:page.title,
      description:page.description,
      headings:page.headings.slice(0,18),
      paragraphs:page.paragraphs.slice(0,18),
      listItems:page.listItems.slice(0,16),
      questions:page.questions.slice(0,15),
      quotes:page.quotes.slice(0,12)
    })),
    exactLanguageCandidates:result.exactLanguageCandidates,
    proofCandidates:result.proofCandidates
  };
}

function key(text:string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

export async function refineWebsiteResearchWithModel(result:WebsiteResearchResult,provider:ModelProvider):Promise<WebsiteResearchResult> {
  const raw = await provider.generate<ReturnType<typeof compactResearchContext>,unknown>({
    task:'website-research',
    input:compactResearchContext(result),
    system:`You are the senior client-research strategist for a Meta ads agency. Your job is to turn public website copy into a precise client creative profile draft.

Rules:
- Use ONLY the supplied page content. Never invent products, customers, results, testimonials, prices, proof, claims, or positioning.
- Prefer specific source-grounded language over generic marketing phrasing.
- Customer-language entries must be exact or near-exact language actually present in supplied quotes, FAQs, headings, or page copy.
- If a field is not supported by the source, omit it or return an empty array. Do not guess.
- Separate audience pain from desired outcomes and from objections.
- For uniqueMechanism, only state a mechanism if the source explains why/how the offer works differently.
- Be especially careful with pages that SHOW EXAMPLE ADS, DEMO COPY, mock dashboards, sample testimonials, template content, fictional customers, or illustrative metrics. Those examples describe what the product can create; they are NOT automatically proof about the business itself.
- Review every supplied proofCandidates item. Classify it as likely-proof, example-or-demo, or not-proof. A likely-proof item must read as an actual factual result, customer testimonial, credential, adoption metric, or case-study claim about this business/offer — not a sample ad being displayed on the page.
- Never approve proof for advertising; this classification only decides whether it belongs in the human-review queue.
- Return JSON only with these optional keys: clientName, industry, businessSummary, brandVoice, audience, offer, proofReview, researchNotes.
- brandVoice may contain traits, phrasesToUse, writingNotes.
- audience may contain description, desires, pains, objections, customerLanguage, buyingTriggers, anxieties.
- offer may contain name, offerType, summary, primaryPromise, uniqueMechanism, deliverables, differentiators, objections.
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
  const offer = profile.offers[0];
  if (offer && synthesis.offer) {
    if (synthesis.offer.name) offer.name=synthesis.offer.name;
    if (synthesis.offer.offerType) offer.offerType=synthesis.offer.offerType;
    if (synthesis.offer.summary) offer.summary=synthesis.offer.summary;
    if (synthesis.offer.primaryPromise) offer.primaryPromise=synthesis.offer.primaryPromise;
    if (synthesis.offer.uniqueMechanism) offer.uniqueMechanism=synthesis.offer.uniqueMechanism;
    offer.deliverables=synthesis.offer.deliverables;
    offer.differentiators=synthesis.offer.differentiators;
    offer.objections=synthesis.offer.objections;
  }

  if (synthesis.proofReview.length) {
    const likely=new Set(synthesis.proofReview.filter(item=>item.classification==='likely-proof').map(item=>key(item.text)));
    const excluded=synthesis.proofReview.filter(item=>item.classification!=='likely-proof');
    result.proofCandidates=result.proofCandidates.filter(text=>likely.has(key(text)));
    profile.proofLibrary=profile.proofLibrary.filter(item=>likely.has(key(item.text)));
    if (offer) offer.proofItemIds=profile.proofLibrary.map(item=>item.id);
    if (excluded.length) profile.sourceNotes.push(`AI proof review excluded ${excluded.length} candidate${excluded.length===1?'':'s'} as demo/example or non-proof content.`);
  }

  profile.sourceNotes=[...profile.sourceNotes,...synthesis.researchNotes,'Semantic website synthesis completed with configured model provider.'];
  return result;
}
