import type { CreativeEngineInput } from '../schemas/index.js';

export type MixSlot = { format: string; count: number; rationale: string };

export function buildCreativeMix(input: CreativeEngineInput): MixSlot[] {
  const text = `${input.offer.offerType} ${input.offer.summary}`.toLowerCase();
  const founder = input.brand.photography.founderLed || input.mediaAssets.some(a => a.founderPresent);
  const isSaas = /saas|software|app|platform|tool|dashboard/.test(text);
  const isEcom = /ecom|e-commerce|shop|product|retail|physical/.test(text);
  const n = input.requestedCreativeCount;
  const preferred = new Set(input.preferredFormats);
  const excluded = new Set(input.excludedFormats);

  const base = isSaas
    ? [
        ['annotated-screenshot', .22, 'Show the product and mechanism directly'],
        ['screen-recording', .22, 'Demonstrate a useful outcome'],
        ['designed-static', .18, 'Communicate positioning quickly'],
        ['carousel', .18, 'Teach or compare progressively'],
        ['talking-head', founder ? .20 : .10, founder ? 'Add founder trust and explanation' : 'Humanize product education'],
        ['kinetic-typography', founder ? 0 : .10, 'Add a high-contrast message-led format']
      ]
    : isEcom
    ? [
        ['ugc-demo', .25, 'Show product use naturally'],
        ['ugc-photo-overlay', .20, 'Native trust-led static'],
        ['designed-static', .20, 'Benefit-led product communication'],
        ['broll-voiceover', .20, 'Show product in context'],
        ['carousel', .15, 'Explain benefits or comparisons']
      ]
    : [
        ['talking-head', founder ? .25 : .18, 'Trust-led expert delivery'],
        ['ugc-photo-overlay', founder ? .20 : .12, 'Face-forward native creative'],
        ['editorial-static', .20, 'Strong premium positioning'],
        ['carousel', .18, 'Education and objection handling'],
        ['broll-voiceover', .17, 'Story and aspiration'],
        ['designed-static', founder ? 0 : .15, 'Fast message comprehension']
      ];

  let candidates = base.filter(([id]) => !excluded.has(id as any));
  if (preferred.size) candidates = candidates.sort((a,b) => Number(preferred.has(b[0] as any)) - Number(preferred.has(a[0] as any)));

  const raw = candidates.map(([format, weight, rationale]) => ({ format: String(format), exact: Number(weight) * n, rationale: String(rationale) }));
  const counts = raw.map(x => ({ ...x, count: Math.floor(x.exact) }));
  let assigned = counts.reduce((s,x) => s + x.count, 0);
  counts.sort((a,b) => (b.exact-b.count) - (a.exact-a.count));
  for (let i=0; assigned<n && counts.length; i=(i+1)%counts.length) { counts[i].count++; assigned++; }
  return counts.filter(x => x.count > 0).map(({format,count,rationale}) => ({format,count,rationale}));
}
