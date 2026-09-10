import { describe, expect, it, vi } from 'vitest';
import { OpenAIModelProvider } from '../src/providers/openaiModelProvider.js';

describe('OpenAIModelProvider', () => {
  it('uses the Responses API with strict structured output and does not store requests', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(payload.model).toBe('gpt-5.6-terra');
      expect(payload.store).toBe(false);
      expect(payload.text.format.type).toBe('json_schema');
      expect(payload.text.format.strict).toBe(true);
      expect(payload.text.format.name).toBe('RefinedCreativeRoute');
      expect(payload.reasoning.effort).toBe('medium');

      return new Response(JSON.stringify({
        output:[{
          type:'message',
          content:[{
            type:'output_text',
            text:JSON.stringify({
              conceptName:'Stop guessing what to make',
              singleBigIdea:'The offer should determine the creative strategy.',
              primaryHook:'Your ad problem might be happening before you open Ads Manager.',
              visualSummary:'Founder at a desk beside three concrete creative directions pulled from one offer page.',
              whyItFits:'It makes the hidden strategy gap visible without inventing proof.',
              scores:{ strategicClarity:91, visualStopPower:84, relevance:94, specificity:88, glanceComprehension:89 }
            })
          }]
        }]
      }), { status:200, headers:{ 'content-type':'application/json' } });
    });

    const provider = new OpenAIModelProvider({ apiKey:'test-key', fetchFn:fetchFn as typeof fetch });
    const result = await provider.generate<unknown,{ conceptName:string }>({
      task:'route-ideation',
      input:{ offer:'test' },
      responseSchemaName:'RefinedCreativeRoute',
      system:'Test system prompt.'
    });

    expect(result.conceptName).toBe('Stop guessing what to make');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('surfaces API errors without leaking credentials', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ error:{ message:'Rate limit reached.' } }), { status:429, headers:{ 'content-type':'application/json' } }));
    const provider = new OpenAIModelProvider({ apiKey:'super-secret', fetchFn:fetchFn as typeof fetch });

    await expect(provider.generate({ task:'creative-brief', input:{} })).rejects.toThrow('Rate limit reached.');
    await expect(provider.generate({ task:'creative-brief', input:{} })).rejects.not.toThrow('super-secret');
  });
});
