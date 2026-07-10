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
  'c',
]);

export const PenaltyReasonSchema = z.enum([
  'atesugi',
  'jogai',
  'time_wasting',
  'mubobi',
  'grabbing',
  'other',
  'ten_count',
]);

export const TargetSchema = z.enum(['jodan', 'chudan']);
export const TechniqueSchema = z.enum(['tsuki', 'keri']);

export const WinReasonSchema = z.enum([
  'point_gap',
  'target_score',
  'time_up',
  'hansoku',
  'senshu',
  'ippon_count',
  'wazaari_count',
  'hantei',
]);

export const MatchSettingsSchema = z.object({
  durationSec: z.number().int().positive(),
  targetScore: z.number().int().positive(),
  pointGap: z.number().int().positive(),
  senshuEnabled: z.boolean(),
});

export const ScoringEventInputSchema = z
  .object({
    id: UuidSchema,
    matchId: UuidSchema,
    side: SideSchema,
    kind: ScoringEventKindSchema,
    target: TargetSchema.optional(),
    technique: TechniqueSchema.optional(),
    penaltyReason: PenaltyReasonSchema.optional(),
    occurredAtMs: z.number().int().nonnegative(),
    remainingMs: z.number().int().nonnegative(),
  })
  .refine(
    (e) => e.kind !== 'c' || e.penaltyReason !== undefined,
    { message: 'penaltyReason is required for a c penalty', path: ['penaltyReason'] },
  );

export type ScoringEventInput = z.infer<typeof ScoringEventInputSchema>;
export type MatchSettingsInput = z.infer<typeof MatchSettingsSchema>;
