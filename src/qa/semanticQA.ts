import type { CreativeBrief } from '../schemas/index.js';

const forbidden = [/^card\s*\d+/i,/^headline\s*:/i,/^subhead\s*:/i,/^hook\s*:/i,/^cta slide/i,/left side label/i,/visual should/i,/drawn across/i,/show:/i];

export function semanticQA(brief: CreativeBrief) {
  const fields = [brief.headline, brief.supportingCopy, brief.cta].filter(Boolean) as string[];
  const criticalFailures: string[] = [];
  const warnings: string[] = [];
  for (const value of fields) {
    if (forbidden.some(rx => rx.test(value))) criticalFailures.push(`Internal production language leaked into rendered copy: “${value}”`);
    if (value.trim().length < 3) warnings.push(`Rendered copy is too short to be meaningful: “${value}”`);
  }
  if (!brief.headline.trim()) criticalFailures.push('Headline is blank.');
  if (brief.supportingCopy && /^[A-Z\s]{2,18}$/.test(brief.supportingCopy.trim()) && brief.supportingCopy.trim().split(/\s+/).length <= 3) warnings.push('Supporting copy may be an orphaned label or bare noun phrase; omit or rewrite it.');
  return { criticalFailures, warnings };
}
