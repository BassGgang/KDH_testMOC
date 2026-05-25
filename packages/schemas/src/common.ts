import { z } from 'zod';

// Accepts UUID v1-v8 (including v7 used for device-generated IDs).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const UuidSchema = z.string().regex(UUID_REGEX, 'Must be a valid UUID');

export const IsoDateTimeSchema = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Must be an ISO 8601 datetime');

export const SideSchema = z.enum(['AKA', 'AO']);

export const ScoringEventKindSchema = z.enum([
  'ippon',
  'waza_ari',
  'yuko',
  'c1',
  'c2',
  'hansoku',
  'kiken',
  'shikkaku',
]);

export const WinReasonSchema = z.enum([
  'point_gap',
  'target_score',
  'time_up',
  'hansoku',
  'kiken',
  'shikkaku',
  'hantei',
]);

export const MatchSettingsSchema = z.object({
  durationSec: z.number().int().positive(),
  targetScore: z.number().int().positive(),
  pointGap: z.number().int().positive(),
  senshuEnabled: z.boolean(),
});

export const ScoringEventInputSchema = z.object({
  id: UuidSchema,
  matchId: UuidSchema,
  side: SideSchema,
  kind: ScoringEventKindSchema,
  technique: z.string().min(1).max(100).optional(),
  occurredAtMs: z.number().int().nonnegative(),
});

export type ScoringEventInput = z.infer<typeof ScoringEventInputSchema>;
export type MatchSettingsInput = z.infer<typeof MatchSettingsSchema>;
