import { z } from 'zod';
import { MatchSettingsSchema, ScoringEventInputSchema, UuidSchema } from './common';

// Optional match metadata sent on the first sync for a match so the server
// can upsert the matches row. Subsequent syncs may omit it.
export const MatchDraftSchema = z.object({
  type: z.literal('Kumite'),
  round: z.number().int().positive(),
  tatamiNo: z.number().int().positive().nullable(),
  tournamentId: UuidSchema.nullable(),
  categoryId: UuidSchema.nullable(),
  akaAthleteId: UuidSchema.nullable(),
  aoAthleteId: UuidSchema.nullable(),
  settings: MatchSettingsSchema,
  startedAt: z.string().datetime().nullable(),
});

export type MatchDraft = z.infer<typeof MatchDraftSchema>;

export const SyncEventsRequestSchema = z
  .object({
    matchId: UuidSchema,
    match: MatchDraftSchema.optional(),
    events: z.array(ScoringEventInputSchema).min(1).max(200),
  })
  .refine(
    (req) => req.events.every((e) => e.matchId === req.matchId),
    { message: 'Every event.matchId must equal the request matchId', path: ['events'] },
  );

export type SyncEventsRequest = z.infer<typeof SyncEventsRequestSchema>;

export const SyncEventsResponseSchema = z.object({
  matchId: UuidSchema,
  acceptedEventIds: z.array(UuidSchema),
  duplicateEventIds: z.array(UuidSchema),
});

export type SyncEventsResponse = z.infer<typeof SyncEventsResponseSchema>;
