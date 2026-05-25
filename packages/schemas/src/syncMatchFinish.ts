import { z } from 'zod';
import {
  IsoDateTimeSchema,
  MatchSettingsSchema,
  ScoringEventInputSchema,
  SideSchema,
  UuidSchema,
  WinReasonSchema,
} from './common';

const ParticipantSchema = z.object({
  athleteId: UuidSchema.nullable(),
});

const ResultSchema = z.object({
  winnerId: UuidSchema.nullable(),
  reason: WinReasonSchema,
  senshuHolder: SideSchema.nullable(),
});

export const SyncMatchFinishRequestSchema = z
  .object({
    matchId: UuidSchema,
    tournamentId: UuidSchema.nullable(),
    categoryId: UuidSchema.nullable(),
    type: z.literal('Kumite'),                 // MVP: Kumite only
    round: z.number().int().positive(),
    tatamiNo: z.number().int().positive().nullable(),
    startedAt: IsoDateTimeSchema,
    endedAt: IsoDateTimeSchema,
    aka: ParticipantSchema,
    ao: ParticipantSchema,
    settings: MatchSettingsSchema,
    events: z.array(ScoringEventInputSchema).max(500),
    result: ResultSchema,
  })
  .refine(
    (req) => Date.parse(req.endedAt) >= Date.parse(req.startedAt),
    { message: 'endedAt must be >= startedAt', path: ['endedAt'] },
  )
  .refine(
    (req) => req.events.every((e) => e.matchId === req.matchId),
    { message: 'Every event.matchId must equal the request matchId', path: ['events'] },
  )
  .refine(
    (req) => req.aka.athleteId === null || req.ao.athleteId === null
      || req.aka.athleteId !== req.ao.athleteId,
    { message: 'aka and ao must be different athletes', path: ['ao'] },
  );

export type SyncMatchFinishRequest = z.infer<typeof SyncMatchFinishRequestSchema>;

export const SyncMatchFinishResponseSchema = z.object({
  matchId: UuidSchema,
  status: z.enum(['created', 'duplicate']),
  serverWinnerId: UuidSchema.nullable(),
  serverReason: WinReasonSchema,
});

export type SyncMatchFinishResponse = z.infer<typeof SyncMatchFinishResponseSchema>;
