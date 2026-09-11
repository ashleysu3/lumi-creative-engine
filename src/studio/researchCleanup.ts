import type { WebsiteResearchResult, WebsitePageFinding } from './websiteResearch.js';

const BOILERPLATE = /\b(?:privacy policy|terms(?: of service| and conditions)?|cookie(?:s| policy)?|all rights reserved|copyright|log in|sign in|my account|shopping cart|skip to content|menu|newsletter|subscribe|follow us|contact us|accessibility|powered by|site map|sitemap)\b/i;
const CTA_ONLY = /^(?:learn more|read more|get started|start now|click here|shop now|buy now|book now|apply now|join now|sign up|subscribe|contact us|download now)[.!]?$/i;
const RESULT_WORDS = /\b(?:grew|growth|increase(?:d)?|decrease(?:d)?|saved|earned|generated|booked|sold|sales|revenue|roi|roas|conversion|conversions|results?|profit|leads?|appointments?|completed|filled|launched|scaled|reduced|cut|doubled|tripled|certified|award(?:ed)?|featured)\b/i;
const AUDIENCE_COUNT_WORDS = /\b(?:clients?|customers?|students?|members?|users?|founders?|businesses?|brands?)\b/i;
const PAIN_WORDS = /\b(?:struggl\w*|tired|overwhelm\w*|frustrat\w*|stuck|confus\w*|wast\w*|hard|difficult|problem|without|fear\w*|stress\w*|burnout|challenge\w*|guess\w*|blank page|not working|isn'?t working|doesn'?t work)\b/i;
const DESIRE_WORDS = /\b(?:want|finally|easier|simple|simpler|grow|build|create|save time|more sales|more leads|clarity|confidence|freedom|results?|transform|achieve|increase|book|launch|convert|conversion|profitable|consistent|scale)\b/i;
const OBJECTION_WORDS = /\b(?:how much|cost|price|what if|do i need|does this|will this|can i|is this|refund|cancel|time|experience|beginner|worth|already use|another tool|too expensive|too much)\b/i;

function normalize(text:string) {
  return text.replace(/\s+/g,' ').replace(/^[•·▪◦\-–—]+\s*/,'').trim();
}

function sentenceParts(text:string):string[] {
  const cleaned=normalize(text);
  if (!cleaned) return [];
  const matches=cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  return matches.map(normalize).filter(Boolean);
}

function canonical(text:string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function usable(text:string,min=12,max=220) {
  const t=normalize(text);
  if (t.length<min || t.length>max) return false;
  if (BOILERPLATE.test(t) || CTA_ONLY.test(t)) return false;
  if (t.split(/\s+/).length<3) return false;
  return true;
}

function cleanShortList(values:string[],max:number) {
  const seen=new Set<string>();
  return values.map(normalize).filter(text=>{
    if (text.length<4 || text.length>95 || BOILERPLATE.test(text) || CTA_ONLY.test(text)) return false;
    const key=canonical(text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,max);
}

function uniqueRanked(values:string[],score:(text:string)=>number,max:number,minScore=1) {
  const seen=new Set<string>();
  return values
    .flatMap(sentenceParts)
    .filter(text=>usable(text))
    .map(text=>({text,score:score(text)}))
    .filter(item=>item.score>=minScore)
    .sort((a,b)=>b.score-a.score || a.text.length-b.text.length)
    .filter(item=>{const key=canonical(item.text);if(!key||seen.has(key)) return false;seen.add(key);return true;})
    .slice(0,max)
    .map(item=>item.text);
}

function numberSignal(text:string) {
  return /(?:\$\s?\d|\b\d+(?:[.,]\d+)?%\b|\b\d+(?:\.\d+)?x\b|\b\d{2,}[kKmM]?\+?\b)/i.test(text);
}

function proofScore(text:string) {
  let score=0;
  const quoted=/^[“\"']|[”\"']$/.test(text);
  const firstPerson=/\b(?:i|i'm|i've|me|my|we|we're|our)\b/i.test(text);
  if (numberSignal(text)) score+=2;
  if (RESULT_WORDS.test(text)) score+=2;
  if (numberSignal(text) && AUDIENCE_COUNT_WORDS.test(text)) score+=2;
  if (quoted) score+=2;
  if (firstPerson) score+=1;
  if (/\b(?:testimonial|review|case study|featured in|certified|award)\b/i.test(text)) score+=2;
  if (/\bI help\b/i.test(text)) score-=2;
  if (/\b(?:ai|platform|software|service|program)\b/i.test(text) && !numberSignal(text) && !quoted && !/\b(?:testimonial|review|case study)\b/i.test(text)) score-=1;
  return score;
}

function languageScore(text:string) {
  let score=0;
  if (text.endsWith('?')) score+=3;
  if (/\b(?:I|I'm|I've|me|my|we|we're|our)\b/.test(text)) score+=2;
  if (PAIN_WORDS.test(text) || DESIRE_WORDS.test(text) || OBJECTION_WORDS.test(text)) score+=1;
  if (text.length<=140) score+=1;
  return score;
}

function fieldScore(regex:RegExp) {
  return (text:string)=>regex.test(text)?2:0;
}

function concise(values:string[],max=220) {
  for (const value of values) {
    for (const part of sentenceParts(value)) {
      if (usable(part,24,max)) return part;
    }
  }
  return '';
}

function pageForUrl(pages:WebsitePageFinding[],url?:string) {
  if (!url) return undefined;
  try {
    const target=new URL(url).pathname.replace(/\/$/,'');
    return pages.find(page=>{try{return new URL(page.url).pathname.replace(/\/$/,'')===target;}catch{return false;}});
  } catch { return undefined; }
}

function explicitAudience(pages:WebsitePageFinding[]) {
  const pool=pages.flatMap(page=>[page.description,...page.headings,...page.paragraphs.slice(0,12)]);
  const candidates=uniqueRanked(pool,text=>/\b(?:built|designed|made|created|perfect|ideal)\s+for\b|\b(?:help|helps|helping)\s+\w/i.test(text)?3:0,6,3);
  return candidates[0] ?? '';
}

function sourceForText(pages:WebsitePageFinding[],text:string) {
  const needle=canonical(text).slice(0,80);
  return pages.find(page=>[...page.quotes,...page.paragraphs,...page.listItems,...page.headings].some(value=>canonical(value).includes(needle)))?.url;
}

export function cleanupWebsiteResearch(result:WebsiteResearchResult):WebsiteResearchResult {
  const profile=result.profileDraft;
  const home=result.pages[0];
  const offer=profile.offers[0];
  const offerPage=pageForUrl(result.pages,offer?.url) ?? home;
  const audience=profile.audiences[0];

  const proofPool=[...result.proofCandidates,...result.pages.flatMap(page=>[...page.quotes,...page.paragraphs,...page.listItems])];
  const cleanedProof=uniqueRanked(proofPool,proofScore,12,3);
  const languagePool=[...result.exactLanguageCandidates,...result.pages.flatMap(page=>[...page.questions,...page.quotes])];
  const cleanedLanguage=uniqueRanked(languagePool,languageScore,12,2);

  result.proofCandidates=cleanedProof;
  result.exactLanguageCandidates=cleanedLanguage;

  if (home) {
    profile.businessSummary=concise([home.description,...home.paragraphs,...home.headings],220) || profile.businessSummary;
  }

  if (offer && offerPage) {
    const betterSummary=concise([offerPage.description,...offerPage.paragraphs,...offerPage.headings],220);
    if (betterSummary) offer.summary=betterSummary;
    offer.deliverables=cleanShortList(offer.deliverables,6);
    offer.objections=uniqueRanked([...offer.objections,...offerPage.questions],fieldScore(OBJECTION_WORDS),6,2);
  }

  if (audience) {
    const sourcePain=[...audience.pains,...result.pages.flatMap(page=>[...page.headings,...page.paragraphs])];
    const sourceDesire=[...audience.desires,...result.pages.flatMap(page=>[...page.headings,...page.paragraphs,...page.listItems])];
    const sourceObjection=[...audience.objections,...result.pages.flatMap(page=>page.questions)];
    audience.pains=uniqueRanked(sourcePain,fieldScore(PAIN_WORDS),6,2);
    audience.desires=uniqueRanked(sourceDesire,fieldScore(DESIRE_WORDS),6,2);
    audience.objections=uniqueRanked(sourceObjection,fieldScore(OBJECTION_WORDS),6,2);
    audience.customerLanguage=cleanedLanguage;
    const explicit=explicitAudience(result.pages);
    if (explicit) audience.description=explicit;
    else if (/^People described by the website as/i.test(audience.description) || audience.description.length>220) audience.description='Audience needs agency review; the public site did not contain a concise, high-confidence audience statement.';
  }

  profile.proofLibrary=cleanedProof.map((text,index)=>({
    id:`proof-${index}`,
    type:numberSignal(text)?('metric' as const):('other' as const),
    text,
    source:sourceForText(result.pages,text),
    verified:false,
    approvedForAds:false,
    notes:'Detected from public source material. Must be verified and approved before ad use.'
  }));
  if (offer) offer.proofItemIds=profile.proofLibrary.map(item=>item.id);

  profile.brandVoice.phrasesToUse=uniqueRanked(profile.brandVoice.phrasesToUse,text=>text.length<=110?1:0,6,1);
  profile.sourceNotes=[...profile.sourceNotes,'Research cleanup applied: boilerplate removed, long blocks split into concise evidence, and low-confidence proof/audience inferences suppressed.'];
  return result;
}
