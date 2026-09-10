import type { CreativeBrief, CreativeEngineInput, CreativeRoute } from '../schemas/index.js';

/** Ordered for renderers: background, primary ink, accent, secondary. */
function strongestColor(input: CreativeEngineInput) {
  const candidates = [
    input.brand.colors.background[0],
    input.brand.colors.primary[0],
    input.brand.colors.accent[0],
    input.brand.colors.secondary[0]
  ];
  return candidates.filter((color):color is string => typeof color === 'string' && !input.brand.colors.prohibited.includes(color));
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
    ...input.brand.avoidExamples,
    ...input.offer.claimsProhibited,
    'invented testimonials or performance claims',
    'generic AI brains, robots, rockets, or floating laptop mockups unless explicitly relevant',
    'production-spec labels in customer-facing copy'
  ];
  const typographyRoles = Object.fromEntries(
    Object.entries(input.brand.typography.roles).filter(([,value])=>Boolean(value))
  );
  const photoTreatment = [
    ...input.brand.photography.treatment,
    ...input.brand.photography.styleNotes,
    ...input.brand.photography.lighting,
    ...input.brand.photography.cropRules
  ].join('; ') || (founderPreferred ? 'Natural, credible, founder-forward.' : undefined);
  const layoutNotes = [
    ...(input.brand.layout.density ? [`Density: ${input.brand.layout.density}`] : []),
    ...input.brand.layout.spacingNotes,
    ...input.brand.layout.personality
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
      headlineFont: input.brand.typography.roles.headline?.family ?? input.brand.typography.headlineFamily,
      bodyFont: input.brand.typography.roles.body?.family ?? input.brand.typography.bodyFamily,
      photoTreatment,
      motifs: input.brand.motifs,
      typographyRoles,
      textures: input.brand.textures,
      patterns: input.brand.patterns,
      logoRules: {
        clearSpace:input.brand.logoRules.clearSpace,
        preferredPlacements:input.brand.logoRules.preferredPlacements
      },
      components:input.brand.components,
      layoutNotes
    }
  };
}
