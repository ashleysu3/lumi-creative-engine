# After Organic Creative Studio

The Creative Studio is the internal agency product surface around the reusable creative engine.

## Product goal

Capture the information a strong Meta creative strategist actually needs once per client, then turn each new campaign brief into a coordinated production batch:

- finished static ad concepts and renders;
- B-roll ads with hook, voiceover, timed shot sequence, selected uploaded segments, on-screen text, CTA, and edit notes;
- talking-head scripts with alternate hooks, delivery direction, on-screen text, and B-roll insert ideas;
- carousels with slide-by-slide approved user-facing copy;
- later: finished rendered B-roll/video files and performance-learning feedback.

## Client research / ingestion

`/research` is the intake accelerator. Give it a public client website and it will crawl a small, bounded set of same-site pages, prioritize offer/service/program/pricing/FAQ/testimonial/result pages, and build a reviewable client-profile draft.

Current extraction includes:

- business/site summary and primary-offer candidate;
- headline and page copy;
- audience clues, pains, desires, FAQ/objection clues;
- exact-language candidates from quotes and FAQs;
- possible deliverables from offer-page lists;
- proof/testimonial/metric candidates;
- colors and font-family clues found in public HTML/CSS;
- public social-account links discovered on the site;
- source-page URLs and crawl warnings.

Important safety rules:

- proof discovered by research is **never** automatically verified or approved for ads;
- the crawler only uses normal public HTTP(S) pages and blocks obvious local/private-network targets;
- it does not bypass platform authentication or attempt to access private social data;
- social accounts are currently discovered/recorded as sources; deeper Instagram/Facebook/TikTok/YouTube ingestion should use official account connections/APIs where available;
- crawl scope is intentionally small (maximum 15 pages) and should be used for advertiser-owned or otherwise authorized public sites.

A research draft is saved into the same browser-local client profile store and automatically loads when the user returns to `/studio`.

## Information model

### Persistent client creative profile

The client profile is the account-level brain and should change only when new information is learned.

It includes:

- business and positioning summary;
- brand voice and prohibited language;
- visual brand system and founder-presence rules;
- audience desires, pains, objections, anxieties, buying triggers, awareness, and exact customer language;
- offer promise, mechanism, deliverables, differentiators, objections, and factual claims;
- verified/approved proof library;
- creative performance learning: winning/losing angles, hooks, formats, audience observations, and performance notes;
- global compliance and client constraints.

### Campaign brief

The campaign brief is the temporary instruction for the current production batch:

- objective and audience temperature;
- offer and audience selection;
- destination URL;
- promotion/urgency;
- key campaign message;
- campaign-specific proof;
- creative-direction notes;
- exact delivery mix: statics, B-roll, talking heads, and carousels.

### Session media

The current MVP accepts founder/lifestyle images, product screenshots, B-roll/video clips, and other still images. Files are sent only for the current session and are not persisted by the browser profile store.

## Current MVP storage and privacy

The repo contains no client data. The browser UI stores text client profiles in `localStorage` only. Uploaded media remains session-only. Do not commit client profile JSON, customer data, testimonials, or media into this repository.

Before team-wide production use, replace browser-only storage with authenticated persistent storage. Recommended split:

- database: client profiles, campaigns, creative records, performance learning;
- object storage: photos, screenshots, logos, video, finished exports;
- application auth: After Organic team-only access.

## Routes

- `/studio` (and `/`) — After Organic Creative Studio
- `/research` — public website research -> reviewable client profile draft
- `/lab` — low-level engine Creative Lab
- `POST /v1/studio/research-website` — bounded public-site crawl + profile draft
- `POST /v1/studio/generate` — profile + campaign + media -> engine input + concepts + agency delivery pack
- `POST /v1/creative/render` — deterministic creative rendering / generated scene pipeline

## Production roadmap

1. Validate website research + client intake + delivery-pack workflow on 2–3 real agency clients.
2. Add official social-source connections/adapters for Instagram/Facebook/TikTok/YouTube where available, plus URL/upload fallback for content the APIs cannot expose.
3. Add media analysis: face/full-body detection, scene/context tags, negative-space scoring, screenshot detection, video segmentation, transcript, and clip timestamps.
4. Add persistent team-only profiles/media via database + object storage.
5. Add real static image generation and raster export with final-pixel visual QA.
6. Add a dedicated video assembly service for B-roll ads (the Worker remains the strategy/API layer; heavy video rendering should run on a media-capable service).
7. Add performance feedback so winning angles/hooks/formats update the client creative profile without blindly copying old ads.

## Core rule

The system is not a random idea generator. It should behave like an agency creative strategist and production coordinator: use verified source material, choose the right format for the message and available assets, produce a deliberately diverse batch, and keep final client-facing copy separate from internal production instructions.
