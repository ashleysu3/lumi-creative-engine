import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../schemas/index.js';

/** Ordered for renderers: background, primary ink, accent, secondary. */
function strongestColor(input: CreativeEngineInput) {
  return [
    input.brand.colors.background[0],
    input.brand.colors.primary[0],
    input.brand.colors.accent[0],
    input.brand.colors.secondary[0]
  ].filter((c):c is string => Boolean(c) && !input.brand.colors.prohibited.includes(c!));
}

export function generateCreativeBrief(input: CreativeEngineInput, route: CreativeRoute): CreativeBrief {
  const angle = input.angles.find(a => a.id === route.angleId);
  const proof = input.offer.proof[0];
  const headline = route.primaryHook;
  const support = angle?.customerTruth || input.audience.customerLanguage[0] || input.audience.desires[0] || undefined;
  const founderPreferred = input.brand.photography.founderLed || input.mediaAssets.some(a => a.founderPresent && a.faceVisible);
  const visualConcept = founderPreferred
    ? `Use a real founder-led visual where possible. The image should create trust and visually support: ${route.singleBigIdea}`
    : `Create a specific visual expression of: ${route.singleBigIdea}. Prioritize concrete subject matter over generic category imagery.`;
  const mustInclude = [
    ...(proof ? [`Verified proof only if useful: ${proof}`] : []),
    ...(input.offer.uniqueMechanism ? [`Unique mechanism: ${input.offer.uniqueMechanism}`] : [])
  ];
  const mustAvoid = [
    ...input.brand.avoid,
    ...input.offer.claimsProhibited,
    'invented testimonials or performance claims',
    'generic AI brains, robots, rockets, or floating laptop mockups unless explicitly relevant',
    'production-spec labels in customer-facing copy'
  ];

  return {
    routeId: route.id,
    headline,
    supportingCopy: support && support !== headline ? support : undefined,
    cta: 'Learn more',
    visualConcept,
    composition: route.format.includes('static') || route.format === 'ugc-photo-overlay' ? '4:5 mobile-first composition with one dominant focal point and intentional text-safe area.' : route.format.includes('carousel') ? 'Progressive slide sequence; one idea per slide; slide 1 earns the swipe.' : 'Mobile-first vertical production with the hook visible or spoken immediately.',
    focalPoint: founderPreferred ? 'Founder face or primary real-world subject, unobstructed.' : 'The single strongest visual representation of the core idea.',
    mustInclude,
    mustAvoid,
    brandAdaptation: {
      colors: strongestColor(input),
      headlineFont: input.brand.typography.headlineFamily,
      bodyFont: input.brand.typography.bodyFamily,
      photoTreatment: input.brand.photography.styleNotes.join('; ') || (founderPreferred ? 'Natural, credible, founder-forward.' : undefined),
      motifs: input.brand.motifs
    }
  };
}
