import { describe, expect, it } from 'vitest';
import { websiteResearchHtml } from '../src/api/researchHtml.js';

describe('After Organic client research UI',()=>{
  it('exposes website research, quality mode, and studio handoff controls',()=>{
    expect(websiteResearchHtml).toContain('Client Research');
    expect(websiteResearchHtml).toContain('/v1/studio/research-website');
    expect(websiteResearchHtml).toContain('Save profile + open Creative Studio');
    expect(websiteResearchHtml).toContain('Save rough draft anyway');
    expect(websiteResearchHtml).toContain('Source-only draft');
    expect(websiteResearchHtml).toContain('AI synthesized');
    expect(websiteResearchHtml).toContain('Proof safety');
  });

  it('has syntactically valid inline browser JavaScript',()=>{
    const match=websiteResearchHtml.match(/<script>([\s\S]*?)<\/script>/i);
    expect(match?.[1]).toBeTruthy();
    expect(()=>new Function(match?.[1] ?? '')).not.toThrow();
  });
});
