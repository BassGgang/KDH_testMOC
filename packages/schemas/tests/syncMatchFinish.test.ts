import { describe, expect, it } from 'vitest';
import { SyncMatchFinishRequestSchema } from '../src/syncMatchFinish';

const MATCH_ID = '01931a4f-1234-7890-abcd-ef1234567890';
const TOURNAMENT_ID = '01931a4f-2222-7890-abcd-ef1234567890';
const CATEGORY_ID = '01931a4f-3333-7890-abcd-ef1234567890';
const AKA_ID = '01931a4f-4444-7890-abcd-ef1234567890';
const AO_ID = '01931a4f-5555-7890-abcd-ef1234567890';

const validPayload = {
  matchId: MATCH_ID,
  tournamentId: TOURNAMENT_ID,
  categoryId: CATEGORY_ID,
  type: 'Kumite' as const,
  round: 1,
  tatamiNo: 3,
  startedAt: '2026-05-24T10:23:00+09:00',
  endedAt: '2026-05-24T10:26:42+09:00',
  aka: { athleteId: AKA_ID },
  ao: { athleteId: AO_ID },
  settings: { durationSec: 180, targetScore: 8, pointGap: 8, senshuEnabled: true },
  events: [],
  result: { winnerId: AKA_ID, reason: 'point_gap' as const, senshuHolder: 'AKA' as const },
};

describe('SyncMatchFinishRequestSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(SyncMatchFinishRequestSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects endedAt earlier than startedAt', () => {
    const r = SyncMatchFinishRequestSchema.safeParse({
      ...validPayload,
      startedAt: '2026-05-24T10:26:42+09:00',
      endedAt: '2026-05-24T10:23:00+09:00',
    });
    expect(r.success).toBe(false);
  });

  it('rejects when aka and ao reference the same athlete', () => {
    const r = SyncMatchFinishRequestSchema.safeParse({
      ...validPayload,
      ao: { athleteId: AKA_ID },
    });
    expect(r.success).toBe(false);
  });

  it('rejects type other than Kumite (MVP scope)', () => {
    const r = SyncMatchFinishRequestSchema.safeParse({ ...validPayload, type: 'Kata' });
    expect(r.success).toBe(false);
  });

  it('accepts null winnerId for hantei tie cases', () => {
    const r = SyncMatchFinishRequestSchema.safeParse({
      ...validPayload,
      result: { winnerId: null, reason: 'hantei', senshuHolder: null },
    });
    expect(r.success).toBe(true);
  });

  it('rejects events whose matchId differs from request matchId', () => {
    const r = SyncMatchFinishRequestSchema.safeParse({
      ...validPayload,
      events: [
        {
          id: '01931a4f-6666-7890-abcd-ef1234567890',
          matchId: '01931a4f-7777-7890-abcd-ef1234567890',
          side: 'AKA',
          kind: 'yuko',
          occurredAtMs: 1000,
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});
