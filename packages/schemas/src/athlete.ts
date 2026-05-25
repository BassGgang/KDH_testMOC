import { z } from 'zod';
import { UuidSchema } from './common';

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

export const MatchHistoryItemSchema = z.object({
  matchId: UuidSchema,
  tournamentName: z.string(),
  date: z.string().date(),
  result: z.enum(['Win', 'Loss']),
  opponentName: z.string(),
  score: z.string(),                 // e.g., "5-3"
});

export type MatchHistoryItem = z.infer<typeof MatchHistoryItemSchema>;

export const AthleteHistoryResponseSchema = z.object({
  athleteId: UuidSchema,
  history: z.array(MatchHistoryItemSchema),
});

export type AthleteHistoryResponse = z.infer<typeof AthleteHistoryResponseSchema>;
