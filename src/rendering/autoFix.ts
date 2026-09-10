import type { PostRenderVisualQAResult, VisualQAInput } from '../qa/postRenderVisualQA.js';

export type AutoFixAction =
  | { type:'move-text'; target:'headline'|'support'|'cta'|'logo'; direction:'up'|'down'|'left'|'right'; amount:number }
  | { type:'shrink-text'; target:'headline'|'support'|'cta'; amount:number }
  | { type:'increase-contrast'; target:'headline'|'support'|'cta'; amount:number }
  | { type:'reframe-media'; x?:number; y?:number; scale?:number }
  | { type:'adjust-spacing'; amount:number };

export type AutoFixAttempt = {
  attempt: number;
  actions: AutoFixAction[];
  before: PostRenderVisualQAResult;
  after?: PostRenderVisualQAResult;
  succeeded: boolean;
};

export function proposeDeterministicFixes(qa: PostRenderVisualQAResult): AutoFixAction[] {
  const fixes: AutoFixAction[] = [];
  for (const issue of qa.issues) {
    if (!issue.autoFixable) continue;
    switch (issue.code) {
      case 'text-overlap': fixes.push({ type:'adjust-spacing', amount:16 }); break;
      case 'cta-collision': fixes.push({ type:'move-text', target:'cta', direction:'up', amount:24 }); break;
      case 'logo-collision': fixes.push({ type:'move-text', target:'logo', direction:'up', amount:20 }); break;
      case 'low-contrast': fixes.push({ type:'increase-contrast', target:'headline', amount:20 }); break;
      case 'small-text': fixes.push({ type:'shrink-text', target:'headline', amount:-8 }); break;
      case 'subject-edge':
      case 'awkward-crop': fixes.push({ type:'reframe-media', scale:0.94 }); break;
      default: break;
    }
  }
  return fixes;
}

export async function autoFixAndRecheck(args: {
  initialQa: PostRenderVisualQAResult;
  visualInput: VisualQAInput;
  render: (actions: AutoFixAction[], attempt:number) => Promise<VisualQAInput>;
  inspect: (input: VisualQAInput) => Promise<PostRenderVisualQAResult>;
  maxAttempts?: number;
}): Promise<{ finalQa: PostRenderVisualQAResult; attempts: AutoFixAttempt[]; visualInput: VisualQAInput }> {
  const attempts: AutoFixAttempt[] = [];
  let qa = args.initialQa;
  let visualInput = args.visualInput;
  const max = args.maxAttempts ?? 3;

  for (let i=1; i<=max && (qa.status === 'auto-fix' || qa.status === 'blocked'); i++) {
    const actions = proposeDeterministicFixes(qa);
    if (!actions.length) break;
    const nextInput = await args.render(actions, i);
    const nextQa = await args.inspect(nextInput);
    attempts.push({ attempt:i, actions, before:qa, after:nextQa, succeeded:nextQa.visualQaScore > qa.visualQaScore || nextQa.status === 'ready' || nextQa.status === 'minor' });
    qa = nextQa;
    visualInput = nextInput;
    if (qa.status === 'ready' || qa.status === 'minor') break;
  }

  return { finalQa: qa, attempts, visualInput };
}
