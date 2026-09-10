# Lumi Creative Engine

A standalone creative-generation and rendering engine for Ads by Lumi.

This repository owns the portable creative intelligence layer that sits between the Lumi app and downstream rendering/generation providers.

## Core flow

Offer + audience + brand + media
→ creative mix
→ archetype selection
→ creative routes
→ production brief
→ media matching
→ compile output
→ render/production instructions
→ QA

The Stencil app should remain the product/UI layer. This engine should remain framework-agnostic where practical and communicate through typed JSON contracts.

## Initial milestones

1. Define stable schemas for offer, audience, brand, media, creative route, creative brief, compiled output, and QA results.
2. Seed portable libraries for archetypes, formats, production treatments, and styles.
3. Implement a deterministic `generateCreativeSet()` orchestration shell using mock providers.
4. Add tests for founder-led, SaaS, ecommerce, brand fidelity, semantic QA, media matching, carousel output, and visual QA contracts.
5. Add model/provider adapters only after the contracts and tests are stable.

## Design principle

Strategy, rendering, and UI are separate concerns. The engine decides what to make and returns structured production instructions. The app controls the customer experience and final presentation.
