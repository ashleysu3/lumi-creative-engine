import { z } from 'zod';
import { ClientCreativeProfileSchema, type ClientCreativeProfile } from './profileSchemas.js';

export const WebsitePageFindingSchema = z.object({
  url:z.string(),
  title:z.string().default(''),
  description:z.string().default(''),
  headings:z.array(z.string()).default([]),
  paragraphs:z.array(z.string()).default([]),
  listItems:z.array(z.string()).default([]),
  questions:z.array(z.string()).default([]),
  quotes:z.array(z.string()).default([]),
  colors:z.array(z.string()).default([]),
  fonts:z.array(z.string()).default([]),
  socialLinks:z.array(z.string()).default([]),
  internalLinks:z.array(z.string()).default([])
});

export const WebsiteResearchResultSchema = z.object({
  rootUrl:z.string(),
  pages:z.array(WebsitePageFindingSchema),
  discoveredSocialLinks:z.array(z.string()).default([]),
  proofCandidates:z.array(z.string()).default([]),
  exactLanguageCandidates:z.array(z.string()).default([]),
  colors:z.array(z.string()).default([]),
  fonts:z.array(z.string()).default([]),
  warnings:z.array(z.string()).default([]),
  profileDraft:ClientCreativeProfileSchema
});

export type WebsitePageFinding = z.infer<typeof WebsitePageFindingSchema>;
export type WebsiteResearchResult = z.infer<typeof WebsiteResearchResultSchema>;

type FetchLike = (input:RequestInfo | URL, init?:RequestInit)=>Promise<Response>;

type ResearchOptions = {
  url:string;
  maxPages?:number;
  extraUrls?:string[];
  fetchImpl?:FetchLike;
};

const SOCIAL_HOSTS = ['instagram.com','facebook.com','tiktok.com','youtube.com','youtu.be','linkedin.com','pinterest.com','threads.net'];
const PRIORITY_PATH = /(about|service|services|offer|offers|program|programs|course|courses|product|products|shop|pricing|faq|frequently|testimonial|testimonials|case-study|case-studies|results|success|membership|book|work-with|coaching|consulting)/i;
const SKIP_EXT = /\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mov|avi|css|js|xml|json|ico)(?:$|\?)/i;

function decodeEntities(input:string) {
  return input
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}

function cleanText(input:string) {
  return decodeEntities(input.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
}

function uniq<T>(values:T[]):T[] { return [...new Set(values)]; }
function takeUseful(values:string[],max:number,min=3) { return uniq(values.map(v=>v.trim()).filter(v=>v.length>=min && v.length<=360)).slice(0,max); }

function attr(tag:string,name:string) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`,'i'));
  return m?.[1]?.trim();
}

function metaContent(html:string,selector:'description'|'og:title'|'og:description'|'application-name') {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = (attr(tag,'name') ?? attr(tag,'property') ?? '').toLowerCase();
    const wanted = selector === 'description' ? 'description' : selector;
    if (key === wanted) return cleanText(attr(tag,'content') ?? '');
  }
  return '';
}

function absoluteUrl(href:string,base:string) {
  try { return new URL(href,base).toString(); } catch { return ''; }
}

export function isSafePublicUrl(value:string):boolean {
  try {
    const u = new URL(value);
    if (!['http:','https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '0.0.0.0') return false;
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split('.').map(Number);
      if (parts[0]===10 || parts[0]===127 || parts[0]===0) return false;
      if (parts[0]===169 && parts[1]===254) return false;
      if (parts[0]===172 && parts[1]>=16 && parts[1]<=31) return false;
      if (parts[0]===192 && parts[1]===168) return false;
      if (parts[0]>=224) return false;
    }
    return true;
  } catch { return false; }
}

export function extractWebsitePage(html:string,url:string):WebsitePageFinding {
  const withoutNoise = html
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi,' ');

  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const title = metaContent(html,'og:title') || cleanText(titleTag);
  const description = metaContent(html,'og:description') || metaContent(html,'description');
  const headings = takeUseful([...withoutNoise.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map(m=>cleanText(m[1])),30);
  const paragraphs = takeUseful([...withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>cleanText(m[1])),50,12);
  const listItems = takeUseful([...withoutNoise.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>cleanText(m[1])),35,4);
  const blockquotes = [...withoutNoise.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi)].map(m=>cleanText(m[1]));
  const quoteSentences = paragraphs.filter(p=>/[“”"][^“”"]{12,}[“”"]/.test(p));
  const quotes = takeUseful([...blockquotes,...quoteSentences],20,12);
  const questions = takeUseful([...headings,...paragraphs,...listItems].filter(x=>x.endsWith('?')),25,5);

  const colors = uniq((html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).map(x=>x.toLowerCase())).slice(0,16);
  const fonts = takeUseful([...html.matchAll(/font-family\s*:\s*([^;}]+)/gi)].flatMap(m=>m[1].split(',').map(x=>x.replace(/["']/g,'').trim())).filter(x=>!/(inherit|serif$|sans-serif$|monospace$|system-ui)/i.test(x)),8,2);

  const socialLinks:string[] = [];
  const internalLinks:string[] = [];
  let origin = '';
  try { origin = new URL(url).origin; } catch {}
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag,'href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const abs = absoluteUrl(href,url);
    if (!abs) continue;
    try {
      const u = new URL(abs);
      if (SOCIAL_HOSTS.some(h=>u.hostname===h || u.hostname.endsWith('.'+h))) socialLinks.push(abs);
      else if (u.origin===origin && !SKIP_EXT.test(u.pathname)) internalLinks.push(u.toString().split('#')[0]);
    } catch {}
  }

  return WebsitePageFindingSchema.parse({url,title,description,headings,paragraphs,listItems,questions,quotes,colors,fonts,socialLinks:uniq(socialLinks),internalLinks:uniq(internalLinks)});
}

function siteName(page:WebsitePageFinding,root:URL) {
  const og = page.title.split(/[|–—-]/)[0]?.trim();
  if (og && og.length<=70) return og;
  return root.hostname.replace(/^www\./,'').split('.')[0].replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

function bestOfferPage(pages:WebsitePageFinding[]) {
  return pages.find(p=>PRIORITY_PATH.test(new URL(p.url).pathname) && /(offer|service|program|course|product|membership|coaching|consulting|pricing)/i.test(p.url+' '+p.title+' '+p.headings.join(' '))) ?? pages[0];
}

function firstUseful(...values:(string|undefined)[]) { return values.find(v=>v && v.trim().length>12)?.trim() ?? ''; }

function inferAudiencePhrase(texts:string[]) {
  for (const text of texts) {
    const m = text.match(/\b(?:for|helping|helps)\s+([A-Za-z][^.!?]{5,90})(?:\s+(?:who|to|with|build|grow|create|find|achieve)\b|[.!?]|$)/i);
    if (m?.[1]) return m[1].trim().replace(/^(the|your)\s+/i,'');
  }
  return '';
}

function evidenceCandidates(pages:WebsitePageFinding[]) {
  const all = pages.flatMap(p=>[...p.quotes,...p.paragraphs,...p.listItems]);
  return takeUseful(all.filter(t=>/\b(?:testimonial|client|customer|students?|members?|reviews?|results?|grew|increased|decreased|saved|earned|generated|booked|sold|revenue|sales|roi|roas|conversion|years? experience|certified|award|featured)\b/i.test(t) || /(?:\$[\d,.]+|\b\d+(?:\.\d+)?%\b|\b\d{2,}\+?\s+(?:clients?|customers?|students?|members?))/i.test(t)),20,12);
}

function exactLanguage(pages:WebsitePageFinding[]) {
  const quotes = pages.flatMap(p=>p.quotes);
  const faq = pages.flatMap(p=>p.questions);
  return takeUseful([...quotes,...faq],24,10);
}

function painCandidates(pages:WebsitePageFinding[]) {
  const all = pages.flatMap(p=>[...p.headings,...p.paragraphs]);
  return takeUseful(all.filter(t=>/\b(?:struggl|tired|overwhelm|frustrat|stuck|confus|wast|hard|problem|without|stop|avoid|fear|stress|burnout|challenge)\w*/i.test(t)),10,10);
}

function desireCandidates(pages:WebsitePageFinding[]) {
  const all = pages.flatMap(p=>[...p.headings,...p.paragraphs,...p.listItems]);
  return takeUseful(all.filter(t=>/\b(?:want|finally|easier|simple|grow|build|create|save time|more sales|more leads|clarity|confidence|freedom|results?|transform|achieve|increase|book|launch)\w*/i.test(t)),10,10);
}

function objectionCandidates(pages:WebsitePageFinding[]) {
  const qs = pages.flatMap(p=>p.questions);
  return takeUseful(qs.filter(q=>/\b(?:how much|cost|price|what if|do i need|does this|will this|can i|is this|refund|cancel|time|experience|beginner|worth)\b/i.test(q)),10,5);
}

function profileFromResearch(rootUrl:string,pages:WebsitePageFinding[]):ClientCreativeProfile {
  const root = new URL(rootUrl);
  const home = pages[0];
  const offer = bestOfferPage(pages);
  const allTexts = pages.flatMap(p=>[p.description,...p.headings,...p.paragraphs]).filter(Boolean);
  const audiencePhrase = inferAudiencePhrase(allTexts);
  const proof = evidenceCandidates(pages);
  const language = exactLanguage(pages);
  const colors = uniq(pages.flatMap(p=>p.colors)).slice(0,8);
  const fonts = uniq(pages.flatMap(p=>p.fonts)).slice(0,4);
  const name = siteName(home,root);
  const offerTitle = offer?.headings[0] || offer?.title || name;
  const businessSummary = firstUseful(home?.description,home?.paragraphs[0],home?.headings.slice(0,2).join('. '));
  const offerSummary = firstUseful(offer?.description,offer?.paragraphs[0],offer?.headings.slice(0,2).join('. '),businessSummary);
  const primaryPromise = offer?.headings[0] && offer.headings[0] !== offerTitle ? offer.headings[0] : offer?.headings[1];
  const listItems = takeUseful(offer?.listItems ?? [],8,4);

  return ClientCreativeProfileSchema.parse({
    id:root.hostname.replace(/^www\./,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase(),
    clientName:name,
    website:rootUrl,
    businessSummary,
    brandVoice:{
      traits:[],
      phrasesToUse:takeUseful(home?.headings ?? [],8,3),
      phrasesToAvoid:[],
      writingNotes:['Website-derived draft: preserve the client\'s exact phrasing where possible; review before production.']
    },
    brand:{
      colors:{primary:colors.slice(0,3),secondary:colors.slice(3,5),accent:colors.slice(5,7),background:[],prohibited:[]},
      typography:{headlineFamily:fonts[0],bodyFamily:fonts[1] ?? fonts[0],allowedWeights:[],notes:[]},
      photography:{founderLed:false,styleNotes:[],avoid:[]},
      logoAssetIds:[],motifs:[],avoid:[],layout:{density:'balanced',personality:[]}
    },
    audiences:[{
      id:'audience-primary',name:'Primary audience',
      description:audiencePhrase ? `People described by the website as ${audiencePhrase}. Review and refine from client/customer data.` : 'Audience requires agency review. Website copy did not provide a reliable explicit audience statement.',
      awarenessLevel:'solution aware',
      desires:desireCandidates(pages),pains:painCandidates(pages),objections:objectionCandidates(pages),customerLanguage:language,
      identitySignals:[],buyingTriggers:[],anxieties:[]
    }],
    offers:[{
      id:'offer-primary',name:offerTitle,url:offer?.url ?? rootUrl,offerType:'unknown',summary:offerSummary,
      primaryPromise:primaryPromise || undefined,uniqueMechanism:undefined,deliverables:listItems,differentiators:[],objections:objectionCandidates(pages),proofItemIds:proof.map((_,i)=>`proof-${i}`),claimsAllowed:[],claimsProhibited:[]
    }],
    proofLibrary:proof.map((text,i)=>({id:`proof-${i}`,type:/(?:\$|%|\d)/.test(text)?'metric':'other',text,source:pages.find(p=>[...p.quotes,...p.paragraphs,...p.listItems].includes(text))?.url,verified:false,approvedForAds:false,notes:'Detected from public website. Must be verified and approved before ad use.'})),
    competitors:[],creativeLearning:{winningAngles:[],losingAngles:[],winningHooks:[],fatiguedHooks:[],winningFormats:[],weakFormats:[],founderNotes:[],visualNotes:[],audienceLearnings:[],performanceNotes:[]},
    globalConstraints:[],mediaAssets:[],
    sourceNotes:[`Website research draft generated from ${pages.length} public page${pages.length===1?'':'s'}.`,`Proof is intentionally unapproved until reviewed by the agency/client.`],
    updatedAt:new Date().toISOString()
  });
}

async function fetchHtml(url:string,fetchImpl:FetchLike):Promise<string> {
  if (!isSafePublicUrl(url)) throw new Error('unsafe_or_invalid_url');
  const response = await fetchImpl(url,{redirect:'follow',headers:{accept:'text/html,application/xhtml+xml','user-agent':'AfterOrganicCreativeStudio/0.9 (+website research for advertiser-owned/public pages)'}});
  if (!response.ok) throw new Error(`fetch_${response.status}`);
  const type = response.headers.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error('not_html');
  const text = await response.text();
  return text.slice(0,350_000);
}

function rankLinks(root:string,links:string[]) {
  const origin = new URL(root).origin;
  return uniq(links).filter(link=>{
    try { const u=new URL(link); return u.origin===origin && !SKIP_EXT.test(u.pathname); } catch { return false; }
  }).sort((a,b)=>Number(PRIORITY_PATH.test(b))-Number(PRIORITY_PATH.test(a)) || a.length-b.length);
}

export async function researchWebsite(options:ResearchOptions):Promise<WebsiteResearchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const root = new URL(options.url.startsWith('http') ? options.url : `https://${options.url}`);
  root.hash='';
  const rootUrl = root.toString();
  if (!isSafePublicUrl(rootUrl)) throw new Error('unsafe_or_invalid_url');
  const maxPages = Math.max(1,Math.min(options.maxPages ?? 10,15));
  const queue = [rootUrl,...(options.extraUrls ?? []).filter(isSafePublicUrl)];
  const seen = new Set<string>();
  const pages:WebsitePageFinding[] = [];
  const warnings:string[] = [];

  while (queue.length && pages.length<maxPages) {
    const next = queue.shift()!;
    let normalized = next;
    try { const u=new URL(next); u.hash=''; normalized=u.toString(); } catch { continue; }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    try {
      const html = await fetchHtml(normalized,fetchImpl);
      const page = extractWebsitePage(html,normalized);
      pages.push(page);
      for (const link of rankLinks(rootUrl,page.internalLinks)) if (!seen.has(link) && queue.length<40) queue.push(link);
    } catch (error) {
      warnings.push(`${normalized}: ${error instanceof Error ? error.message : 'fetch_failed'}`);
    }
  }

  if (!pages.length) throw new Error(warnings[0] ?? 'no_pages_crawled');
  const discoveredSocialLinks = uniq(pages.flatMap(p=>p.socialLinks));
  const result = {
    rootUrl,pages,discoveredSocialLinks,
    proofCandidates:evidenceCandidates(pages),
    exactLanguageCandidates:exactLanguage(pages),
    colors:uniq(pages.flatMap(p=>p.colors)).slice(0,16),
    fonts:uniq(pages.flatMap(p=>p.fonts)).slice(0,8),
    warnings,
    profileDraft:profileFromResearch(rootUrl,pages)
  };
  return WebsiteResearchResultSchema.parse(result);
}
