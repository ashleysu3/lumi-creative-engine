import type { CreativeEngineInput } from '../schemas/index.js';

export type MixSlot = { format: string; count: number; rationale: string };

type WeightedFormat = [format:string, weight:number, rationale:string];

function targetedMix(input:CreativeEngineInput):MixSlot[]|undefined {
  if (!input.formatTargets) return undefined;
  const excluded = new Set(input.excludedFormats);
  const entries = Object.entries(input.formatTargets)
    .filter(([format,count])=>count > 0 && !excluded.has(format as any))
    .map(([format,count])=>({format,count,rationale:'Requested by the agency delivery mix.'}));
  if (!entries.length) return undefined;

  const requested = input.requestedCreativeCount;
  const total = entries.reduce((sum,item)=>sum+item.count,0);
  if (total === requested) return entries;

  if (total > requested) {
    let remaining = requested;
    return entries.map(item=>{
      const count = Math.min(item.count,remaining);
      remaining -= count;
      return {...item,count};
    }).filter(item=>item.count>0);
  }

  const result = entries.map(item=>({...item}));
  let remaining = requested-total;
  for (let i=0; remaining>0 && result.length; i=(i+1)%result.length) {
    result[i].count += 1;
    remaining -= 1;
  }
  return result;
}

export function buildCreativeMix(input: CreativeEngineInput): MixSlot[] {
  const targets = targetedMix(input);
  if (targets) return targets;

  const text = `${input.offer.offerType} ${input.offer.summary}`.toLowerCase();
  const founder = input.brand.photography.founderLed || input.mediaAssets.some(a => a.founderPresent);
  const hasScreenshot = input.mediaAssets.some(a => a.type === 'screenshot');
  const hasVideo = input.mediaAssets.some(a => a.type === 'video');
  const hasFounderPhoto = input.mediaAssets.some(a => a.type === 'image' && a.founderPresent);
  const isSaas = /saas|software|app|platform|tool|dashboard/.test(text);
  const isEcom = /ecom|e-commerce|shop|product|retail|physical/.test(text);
  const n = input.requestedCreativeCount;
  const preferred = new Set(input.preferredFormats);
  const excluded = new Set(input.excludedFormats);

  let base: WeightedFormat[];
  if (isSaas) {
    base = [
      ...(hasScreenshot ? [['annotated-screenshot', .20, 'Use a real product screenshot to show the mechanism directly'] as WeightedFormat] : []),
      ['screen-recording', hasScreenshot || hasVideo ? .20 : .12, hasScreenshot || hasVideo ? 'Demonstrate one useful product outcome' : 'Create a production plan for a future product demo'],
      ['designed-static', hasScreenshot ? .16 : .24, 'Communicate positioning quickly with a message-led design'],
      ['carousel', .18, 'Teach or compare progressively'],
      ['editorial-static', founder && hasFounderPhoto ? .12 : .14, founder && hasFounderPhoto ? 'Use founder trust selectively in a premium editorial execution' : 'Create a premium message-led execution without fake product UI'],
      ...(founder ? [['talking-head', .14, 'Add founder trust and explanation'] as WeightedFormat] : [['kinetic-typography', .12, 'Add a high-contrast message-led format'] as WeightedFormat])
    ];
  } else if (isEcom) {
    base = [
      ['ugc-demo', hasVideo ? .25 : .18, hasVideo ? 'Show product use naturally' : 'Create a production plan for a natural product demo'],
      ['ugc-photo-overlay', .20, 'Native trust-led static'],
      ['designed-static', .22, 'Benefit-led product communication'],
      ['broll-voiceover', hasVideo ? .18 : .12, hasVideo ? 'Use product footage in context' : 'Create a concise B-roll production plan'],
      ['carousel', .17, 'Explain benefits or comparisons']
    ];
  } else {
    base = [
      ['talking-head', founder ? .24 : .16, 'Trust-led expert delivery'],
      ['ugc-photo-overlay', founder && hasFounderPhoto ? .20 : .10, founder && hasFounderPhoto ? 'Use a real face-forward asset selectively' : 'Native-feeling photo execution'],
      ['editorial-static', .22, 'Strong premium positioning'],
      ['carousel', .18, 'Education and objection handling'],
      ['broll-voiceover', .16, 'Story and aspiration'],
      ['designed-static', founder ? .10 : .18, 'Fast message comprehension']
    ];
  }

  let candidates = base.filter(([id]) => !excluded.has(id as any));
  if (preferred.size) {
    const preferredCandidates = candidates.filter(([id]) => preferred.has(id as any));
    if (preferredCandidates.length) candidates = [...preferredCandidates, ...candidates.filter(([id]) => !preferred.has(id as any))];
  }

  const totalWeight = candidates.reduce((sum,[,weight])=>sum+weight,0) || 1;
  const raw = candidates.map(([format, weight, rationale]) => ({ format, exact: (weight / totalWeight) * n, rationale }));
  const counts = raw.map(x => ({ ...x, count: Math.floor(x.exact) }));
  let assigned = counts.reduce((s,x) => s + x.count, 0);
  counts.sort((a,b) => (b.exact-b.count) - (a.exact-a.count));
  for (let i=0; assigned<n && counts.length; i=(i+1)%counts.length) { counts[i].count++; assigned++; }
  return counts.filter(x => x.count > 0).map(({format,count,rationale}) => ({format,count,rationale}));
}
