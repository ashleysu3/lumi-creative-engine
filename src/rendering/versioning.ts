import type { CompiledCreativeOutput } from './compileCreativeOutput.js';
import type { PostRenderVisualQAResult } from '../qa/postRenderVisualQA.js';

export type CreativeVersion = {
  creativeId: string;
  versionId: string;
  parentVersionId?: string;
  createdAt: string;
  compiled: CompiledCreativeOutput;
  flattenedAssetUrl?: string;
  sourceMediaIds: string[];
  layoutConfig?: Record<string, unknown>;
  copyVersion?: Record<string, string | undefined>;
  brandSettingsUsed?: Record<string, unknown>;
  width?: number;
  height?: number;
  aspectRatio?: string;
  qa?: PostRenderVisualQAResult;
};

export function createCreativeVersion(args: Omit<CreativeVersion,'versionId'|'createdAt'> & { versionId?: string; createdAt?: string }): CreativeVersion {
  return {
    ...args,
    versionId: args.versionId ?? `v_${crypto.randomUUID()}`,
    createdAt: args.createdAt ?? new Date().toISOString()
  };
}
