import type { CreativeRoute } from '../schemas/index.js';

export type RedundancyIssue = {
  routeIds: string[];
  dimension: 'archetype'|'format'|'treatment'|'style'|'hook';
  value: string;
  severity: 'warning'|'critical';
};

export function batchRedundancyCheck(routes: CreativeRoute[]): RedundancyIssue[] {
  const issues: RedundancyIssue[] = [];
  const dimensions: Array<[RedundancyIssue['dimension'], (r: CreativeRoute) => string]> = [
    ['archetype', r => r.archetypeId],
    ['format', r => r.format],
    ['treatment', r => r.productionTreatmentId],
    ['style', r => r.styleId],
    ['hook', r => r.primaryHook.trim().toLowerCase()]
  ];

  for (const [dimension, getter] of dimensions) {
    const groups = new Map<string, string[]>();
    for (const route of routes) {
      const value = getter(route);
      groups.set(value, [...(groups.get(value) ?? []), route.id]);
    }
    for (const [value, routeIds] of groups) {
      if (routeIds.length < 2) continue;
      const ratio = routeIds.length / Math.max(routes.length, 1);
      if (dimension === 'hook' || ratio >= 0.5) {
        issues.push({ routeIds, dimension, value, severity: ratio >= 0.67 ? 'critical' : 'warning' });
      }
    }
  }

  return issues;
}
