export type Archetype = {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  awarenessLevels: string[];
  visualStructures: string[];
  hookGuidance: string[];
  avoid: string[];
};

export const archetypes: Archetype[] = [
  ["old-way-new-way", "Old Way / New Way"],
  ["before-after", "Before / After"],
  ["problem-solution", "Problem / Solution"],
  ["big-editorial-headline", "Big Editorial Headline"],
  ["contrarian-belief", "Contrarian Belief"],
  ["you-dont-need-x", "You Don't Need X"],
  ["fake-search", "Fake Search"],
  ["fake-text-message", "Fake Text Message"],
  ["notes-app", "Notes App"],
  ["pov", "POV"],
  ["identity-callout", "Identity Callout"],
  ["this-is-for-you-if", "This Is For You If"],
  ["three-mistakes", "Three Mistakes"],
  ["myth-vs-reality", "Myth vs Reality"],
  ["checklist", "Checklist"],
  ["mini-framework", "Mini Framework"],
  ["comparison-chart", "Comparison Chart"],
  ["annotated-screenshot", "Annotated Screenshot"],
  ["product-closeup", "Product Closeup"],
  ["how-it-works", "How It Works"],
  ["timeline-process", "Timeline / Process"],
  ["customer-quote", "Customer Quote"],
  ["proof-first", "Proof First"],
  ["statistic-led", "Statistic Led"],
  ["objection-crusher", "Objection Crusher"],
  ["founder-confession", "Founder Confession"],
  ["founder-story", "Founder Story"],
  ["ugly-truth", "Ugly Truth"],
  ["aspirational-outcome", "Aspirational Outcome"],
  ["pain-point-callout", "Pain Point Callout"],
  ["micro-moment", "Micro Moment"],
  ["meme-format", "Meme Format"],
  ["handwritten-annotation", "Handwritten Annotation"],
  ["collage", "Collage"],
  ["magazine-editorial", "Magazine Editorial"],
  ["ugc-overlay", "UGC Overlay"],
  ["product-in-context", "Product In Context"],
  ["feature-to-benefit", "Feature to Benefit"],
  ["one-big-benefit", "One Big Benefit"],
  ["curiosity-gap", "Curiosity Gap"],
  ["question-led", "Question Led"],
  ["result-dashboard", "Result Dashboard"]
].map(([id, name]) => ({
  id,
  name,
  description: `${name} creative structure`,
  bestFor: [],
  awarenessLevels: [],
  visualStructures: [],
  hookGuidance: [],
  avoid: []
}));
