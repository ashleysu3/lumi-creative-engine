# After Organic Creative Studio / Lumi Creative Engine

Portable creative strategy and production engine used by the internal **After Organic Creative Studio**. The same engine can later power Ads by Lumi, but the agency studio is the current proving ground.

## Agency workflow

Client website + source URLs
→ cleaned source crawl
→ AI client-research synthesis
→ explicit offer selection
→ persistent client creative profile
→ campaign brief
→ real client media
→ AI creative batch
→ static / carousel render plans + B-roll / talking-head production outputs
→ QA + versioning

The agency studio is available at `/studio`, website research at `/research`, and the lower-level engineering lab at `/lab`.

## Important: deterministic mode is not agency creative

Deterministic generation exists only so the engine's schemas, routing, renderers, and tests can run without external model calls. It produces scaffolding, not client-ready strategy.

**The agency Studio now refuses to generate client deliverables unless an AI model provider is configured.** A client profile created from a source-only website crawl must also be re-run through semantic AI research (or manually completed) before client generation.

## Local AI setup

For Wrangler development, create a local `.dev.vars` file. The repository includes `.dev.vars.example` and `.gitignore` prevents `.dev.vars` from being committed.

```text
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=medium
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=high
```

Then restart `npm run dev` and check the Studio banner. It should say **Agency AI is on**. Never commit a real API key.

## Research rules

The crawler's job is evidence collection, not strategy. It removes common boilerplate and collects relevant page copy, FAQs, possible proof, source URLs, visual-brand clues, and social profile links.

The AI research layer then interprets that evidence. It must:

- use only supplied source material;
- keep uncertain fields sparse instead of guessing;
- separate pains, desires, objections, and customer language;
- distinguish actual proof from example/demo content;
- leave all proof unverified and unapproved for ads;
- identify **multiple offers separately** instead of blending freebies, courses, masterminds, shops, coaching, memberships, and lead magnets into one composite offer.

The research UI asks the agency user to choose the exact offer being advertised before saving the profile.

## Creative quality bar

Internal agency generation is expected to produce work a senior Meta ads strategist would genuinely consider showing a paying client. The AI refinement layer is instructed to completely replace weak seed copy, avoid generic template language, ground concepts in specific buyer moments and source language, and create meaningfully different reasons-to-care across the batch.

A concept should be treated as weak if it could be pasted onto an unrelated brand by changing one noun.

## Engine flow

Offer + audience + brand + media
→ creative mix
→ archetype ranking
→ creative routes
→ AI route refinement
→ production brief
→ AI brief refinement
→ media matching
→ semantic / strategic QA
→ format-specific render plan
→ render provider
→ flattened finished asset
→ post-render visual QA
→ deterministic auto-fix + recheck
→ versioned finished creative

## Rendering rules

Static ads default to **scene-only mode**: generated imagery contains no meaningful text, stats, logos, labels, captions, or UI copy. The composition layer adds exact headline/support/CTA/logo layers deterministically.

Carousel render fields contain only approved user-facing copy. Internal labels such as `CARD 1`, `HOOK`, `HEADLINE:`, `LEFT SIDE`, and visual production directions are prohibited from becoming presentation text.

Uploaded founder photography should win when a founder-led/trust-sensitive offer has a strong matching asset. Generated scenes remain a fallback rather than the default.

## Provider boundaries

`ModelProvider` keeps AI reasoning swappable. `RenderProvider` owns scene generation plus deterministic composition and returns a flattened finished asset. Editable source/layout data stays separate from the flattened asset.

`runPostRenderVisualQA()` normalizes pixel-level QA for cropped faces/products/UI, subject-edge problems, text collisions, contrast, awkward crops, small mobile text, imbalance, and generation artifacts.

`autoFixAndRecheck()` attempts deterministic fixes up to three times without silently changing strategy, claims, hooks, or the selected hero asset.

## Versioning

Every finished render can be stored as a `CreativeVersion` with the compiled render plan, source media IDs, copy version, brand settings, flattened asset URL, dimensions, and QA result. User edits or regenerations should create a new version instead of overwriting history.
