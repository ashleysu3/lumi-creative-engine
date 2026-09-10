import type { z } from 'zod';
import { MediaMatchSchema, QualityResultSchema } from '../schemas/index.js';

export type MediaMatch = z.infer<typeof MediaMatchSchema>;
export type QualityResult = z.infer<typeof QualityResultSchema>;
