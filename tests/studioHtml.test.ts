import { describe, expect, it } from 'vitest';
import { agencyStudioHtml } from '../src/api/studioHtml.js';

describe('After Organic Creative Studio UI',()=>{
  it('ships the five-step internal agency workflow',()=>{
    expect(agencyStudioHtml).toContain('After Organic Creative Studio');
    expect(agencyStudioHtml).toContain('Client creative profile');
    expect(agencyStudioHtml).toContain('Campaign brief');
    expect(agencyStudioHtml).toContain('Media for this batch');
    expect(agencyStudioHtml).toContain('Generate agency creative batch');
    expect(agencyStudioHtml).toContain('Client deliverables');
    expect(agencyStudioHtml).toContain('/v1/studio/generate');
  });

  it('has syntactically valid inline browser JavaScript',()=>{
    const match=agencyStudioHtml.match(/<script>([\s\S]*?)<\/script>/i);
    expect(match?.[1]).toBeTruthy();
    expect(()=>new Function(match?.[1] ?? '')).not.toThrow();
  });

  it('warns that client text is browser-local and media is session-only',()=>{
    expect(agencyStudioHtml).toMatch(/stored only in this browser/i);
    expect(agencyStudioHtml).toMatch(/session-only/i);
  });
});
