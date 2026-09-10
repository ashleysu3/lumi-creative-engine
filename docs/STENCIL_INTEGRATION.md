# Stencil integration

The Stencil app should call the creative engine over HTTP rather than copy engine internals into the app.

## Endpoint

`POST /v1/creative/generate`

Optional auth header when `LUMI_ENGINE_TOKEN` is configured:

`Authorization: Bearer <token>`

## Request

Send the exact `CreativeEngineInput` shape exported by this package: offer, audience, brand system, media assets, approved angles, requested creative count, and preferred/excluded formats.

## Response

```json
{
  "ok": true,
  "data": {
    "requestId": "...",
    "engineVersion": "0.3.0",
    "concepts": [],
    "warnings": []
  }
}
```

Each concept contains its route, brief, media match, pre-render QA, and a format-specific `renderPlan`.

## Suggested Stencil server helper

```ts
export async function generateLumiCreatives(payload: unknown) {
  const baseUrl = process.env.LUMI_CREATIVE_ENGINE_URL;
  const token = process.env.LUMI_CREATIVE_ENGINE_TOKEN;
  if (!baseUrl) throw new Error('LUMI_CREATIVE_ENGINE_URL is not configured');

  const res = await fetch(`${baseUrl}/v1/creative/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json?.message || json?.error || 'Creative engine request failed');
  return json.data;
}
```

Keep this call server-side so credentials never ship to the browser.

## Migration plan

1. Map Stencil's current offer/brand/media records into `CreativeEngineInput` without changing the UI.
2. Add the engine call behind a feature flag.
3. Run old and new creative planning in parallel for internal/admin comparison.
4. Switch Creative Routes to consume engine concepts when confidence is high.
5. Route static/carousel render plans to the new renderer only after creative-strategy acceptance tests pass.
6. Keep old generation available briefly as rollback, then remove duplicated Stencil-side strategy/render logic.

## Important

Do not wire against a stale GitHub snapshot of the Stencil app. Sync/export the current Stencil project to `lumi-ai-meta-ads-10603b` first, then add the server helper to the current structure. The engine contract is intentionally independent of that app structure so the sync can happen later without changing the engine.
