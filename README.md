# Lumi Creative Engine

Standalone creative-generation and rendering intelligence for Ads by Lumi.

The Stencil app remains the product/UI layer. This repository owns the portable creative logic between Lumi's offer/brand/media context and downstream rendering or generation providers.

## Current flow

Offer + audience + brand + media
→ creative mix
→ archetype ranking
→ creative routes
→ production brief
→ media matching
→ semantic / strategic QA
→ format-specific render plan
→ render provider
→ flattened finished asset
→ post-render visual QA
→ deterministic auto-fix + recheck
→ versioned finished creative

## Stable app boundary

```ts
const output = await generateCreativeSet(input)
```

Stencil sends typed JSON containing the offer, audience, brand system, media library, approved angles, and requested creative count. The engine returns concepts with:

- strategic route
- production-ready brief
- media match + optional B-roll segment IDs
- pre-render QA
- static, carousel, or video render plan
- batch redundancy warnings

`src/api/http.ts` exposes a framework-agnostic HTTP adapter so the engine can sit behind a simple POST endpoint without coupling the core to Stencil, React Router, Cloudflare, or another host.

## Rendering rules

Static ads default to **scene-only mode**: generated imagery contains no meaningful text, stats, logos, labels, captions, or UI copy. Lumi adds exact headline/support/CTA/logo layers deterministically.

Carousel render fields contain only approved user-facing copy. Internal labels such as `CARD 1`, `HOOK`, `HEADLINE:`, `LEFT SIDE`, and visual production directions are explicitly prohibited from becoming presentation text.

Uploaded founder photography should win when a founder-led/trust-sensitive offer has a strong matching asset. Generated scenes remain a fallback, not the default simply because generation is available.

## Provider boundaries

`ModelProvider` keeps AI reasoning swappable.

`RenderProvider` owns scene generation plus deterministic composition and must return a flattened finished asset. Editable source/layout data stays separate from the flattened asset.

`runPostRenderVisualQA()` normalizes pixel-level QA for cropped faces/products/UI, subject-edge problems, text collisions, real contrast, awkward crops, small mobile text, imbalance, and generation artifacts.

`autoFixAndRecheck()` attempts deterministic fixes up to three times without silently changing strategy, claims, hooks, or the selected hero asset.

## Versioning

Every finished render can be stored as a `CreativeVersion` with the compiled render plan, source media IDs, copy version, brand settings, flattened asset URL, dimensions, and QA result. User edits or regenerations should create a new version rather than overwrite history.

## Design principle

Strategy, rendering, and UI are separate concerns. Brand visual rules outrank temporary creative style. Uploaded media is a strategic input. The engine should create distinct concepts instead of producing cosmetic variations of the same ad.
