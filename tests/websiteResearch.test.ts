import { describe, expect, it } from 'vitest';
import { extractWebsitePage, isSafePublicUrl, researchWebsite } from '../src/studio/websiteResearch.js';

describe('website research ingestion',()=>{
  it('blocks local and private URL targets',()=>{
    expect(isSafePublicUrl('http://localhost:8787')).toBe(false);
    expect(isSafePublicUrl('http://127.0.0.1/admin')).toBe(false);
    expect(isSafePublicUrl('http://192.168.1.1')).toBe(false);
    expect(isSafePublicUrl('https://example.com')).toBe(true);
  });

  it('extracts public-site copy, brand clues and social links',()=>{
    const html = `<!doctype html><html><head><title>Bright Co | Strategy</title><meta name="description" content="Helping creative founders turn scattered marketing into a clear plan"><style>:root{--brand:#cc6699}body{font-family:'DM Sans',sans-serif}</style></head><body><h1>Know exactly what to say next</h1><p>Stop wasting time guessing what content to create.</p><blockquote>“I booked 12 clients in one month.”</blockquote><a href="/program">Program</a><a href="https://instagram.com/brightco">Instagram</a></body></html>`;
    const page = extractWebsitePage(html,'https://bright.example/');
    expect(page.title).toContain('Bright Co');
    expect(page.colors).toContain('#cc6699');
    expect(page.fonts).toContain('DM Sans');
    expect(page.socialLinks[0]).toContain('instagram.com');
    expect(page.quotes.join(' ')).toContain('12 clients');
    expect(page.internalLinks).toContain('https://bright.example/program');
  });

  it('crawls priority same-origin pages and never auto-approves detected proof',async()=>{
    const pages:Record<string,string> = {
      'https://bright.example/':`<html><head><title>Bright Co</title><meta name="description" content="Helping creative founders turn scattered marketing into a clear plan"></head><body><h1>Marketing clarity for creative founders</h1><p>Stop wasting time guessing what to post and build a simpler strategy.</p><a href="/program">Signature Program</a><a href="/faq">FAQ</a><a href="https://instagram.com/brightco">Instagram</a></body></html>`,
      'https://bright.example/program':`<html><head><title>The Clear Marketing Program</title><meta name="description" content="A six-week strategy program for creative business owners"></head><body><h1>Build the marketing plan you can actually use</h1><ul><li>Messaging strategy</li><li>Campaign plan</li><li>Creative direction</li></ul><p>More than 250 clients have completed the program.</p><blockquote>“I finally know what to say without staring at a blank page.”</blockquote></body></html>`,
      'https://bright.example/faq':`<html><head><title>FAQ</title></head><body><h2>Do I need a big audience?</h2><p>No. The program is built for established small businesses.</p><h2>How much time does this take?</h2></body></html>`
    };
    const mockFetch = async (input:RequestInfo|URL)=>{
      const url = String(input);
      const html = pages[url];
      return html ? new Response(html,{status:200,headers:{'content-type':'text/html'}}) : new Response('missing',{status:404,headers:{'content-type':'text/html'}});
    };
    const result = await researchWebsite({url:'https://bright.example/',maxPages:3,fetchImpl:mockFetch});
    expect(result.pages.length).toBe(3);
    expect(result.discoveredSocialLinks.some(x=>x.includes('instagram.com'))).toBe(true);
    expect(result.profileDraft.offers[0].name).toContain('Build the marketing plan');
    expect(result.profileDraft.offers[0].deliverables).toContain('Messaging strategy');
    expect(result.proofCandidates.join(' ')).toContain('250 clients');
    expect(result.profileDraft.proofLibrary.length).toBeGreaterThan(0);
    expect(result.profileDraft.proofLibrary.every(x=>x.verified===false && x.approvedForAds===false)).toBe(true);
    expect(result.profileDraft.audiences[0].customerLanguage.join(' ')).toContain('blank page');
  });
});
