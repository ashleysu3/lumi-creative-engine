import { expect, it, vi } from 'vitest';
import { OpenAIImageProvider } from '../src/providers/openaiImageProvider.js';

it('generates a portrait scene with no ad text responsibility', async () => {
  const fetchFn = vi.fn(async (_url:string|URL|Request, init?:RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe('gpt-image-2.5-flare');
    expect(payload.size).toBe('1024x1536');
    expect(payload.output_format).toBe('png');
    expect(payload.background).toBe('opaque');
    expect(payload.prompt).toContain('Do not design a finished advertisement');
    expect(payload.prompt).toContain('No text');
    return new Response(JSON.stringify({ data:[{ b64_json:'YWJj' }], output_format:'png' }), { status:200, headers:{'content-type':'application/json'} });
  });
  const provider = new OpenAIImageProvider({ apiKey:'test-key',fetchFn:fetchFn as typeof fetch });
  const asset = await provider.generateScene({
    prompt:'Natural founder portrait at a desk with negative space on the left.',
    negativePrompt:['No text, letters, numbers, logos, labels or watermarks.'],
    width:1080,height:1350
  });
  expect(asset.width).toBe(1024);
  expect(asset.height).toBe(1536);
  expect(asset.mimeType).toBe('image/png');
  expect(asset.url).toBe('data:image/png;base64,YWJj');
});

it('refuses to silently edit a reference image through the generation endpoint', async () => {
  const provider = new OpenAIImageProvider({ apiKey:'test-key',fetchFn:vi.fn() as unknown as typeof fetch });
  await expect(provider.generateScene({
    prompt:'Extend this founder photo.',negativePrompt:[],width:1080,height:1350,referenceAssetUrl:'https://example.com/founder.jpg'
  })).rejects.toThrow('Reference-image editing is not enabled');
});
