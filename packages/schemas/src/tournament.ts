import { z } from 'zod';
import { UuidSchema } from './common';

export const CreateTournamentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().date(),
  ageDivision: z.string().min(1).max(20).default('SENIOR'),
  gender: z.enum(['male', 'female']).default('male'),
  weightClass: z.string().min(1).max(20).default('open'),
  athleteIds: z.array(UuidSchema).min(2).max(64),
});

export type CreateTournamentRequest = z.infer<typeof CreateTournamentRequestSchema>;

export const StartBracketMatchRequestSchema = z.object({
  bracketId: UuidSchema,
  round: z.number().int().positive(),
  position: z.number().int().nonnegative(),  // even-indexed AKA slot in the round
});

export type StartBracketMatchRequest = z.infer<typeof StartBracketMatchRequestSchema>;
