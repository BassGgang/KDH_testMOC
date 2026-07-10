import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common';

export const AthleteStatsSchema = z.object({
  attack: z.number().min(0).max(100),
  defense: z.number().min(0).max(100),
  speed: z.number().min(0).max(100),
  stamina: z.number().min(0).max(100),
  winRate: z.number().min(0).max(100),
  matchCount: z.number().int().nonnegative(),
});

export type AthleteStats = z.infer<typeof AthleteStatsSchema>;

export const AthleteResponseSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(100),
  rank: z.string().min(1).max(50),
  affiliation: z.string().max(100).nullable(),
  birthDate: z.string().date().nullable(),
  gender: z.enum(['male', 'female']).nullable(),
  weightKg: z.number().positive().nullable(),
  stats: AthleteStatsSchema.nullable(),
});

export type AthleteResponse = z.infer<typeof AthleteResponseSchema>;

// Matches the shape returned by GET /api/athletes/:id.
export const MatchHistoryItemSchema = z.object({
  matchId: UuidSchema,
  date: IsoDateTimeSchema.nullable(),
  round: z.number().int().positive(),
  isWin: z.boolean(),
  ownScore: z.number().int().nonnegative(),
  opponentScore: z.number().int().nonnegative(),
  opponentName: z.string(),
});

export type MatchHistoryItem = z.infer<typeof MatchHistoryItemSchema>;

// Full response of GET /api/athletes/:id: profile + stats + history.
export const AthleteDetailResponseSchema = AthleteResponseSchema.extend({
  history: z.array(MatchHistoryItemSchema),
});

export type AthleteDetailResponse = z.infer<typeof AthleteDetailResponseSchema>;
