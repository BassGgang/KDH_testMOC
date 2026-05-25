import { describe, expect, it } from 'vitest';
import { SyncEventsRequestSchema } from '../src/syncEvents';

const MATCH_ID = '01931a4f-1234-7890-abcd-ef1234567890';
const EVENT_ID = '01931a4f-1234-7890-abcd-ef1234567891';

const validEvent = {
  id: EVENT_ID,
  matchId: MATCH_ID,
  side: 'AKA' as const,
  kind: 'yuko' as const,
  occurredAtMs: 1000,
};

describe('SyncEventsRequestSchema', () => {
  it('accepts a valid request with one event', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: MATCH_ID,
      events: [validEvent],
    });
    expect(result.success).toBe(true);
  });

  it('rejects when events array is empty', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: MATCH_ID,
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when an event.matchId differs from request matchId', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: MATCH_ID,
      events: [{ ...validEvent, matchId: '01931a4f-9999-7890-abcd-ef1234567899' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID format', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: 'not-a-uuid',
      events: [validEvent],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative occurredAtMs', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: MATCH_ID,
      events: [{ ...validEvent, occurredAtMs: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown event kind', () => {
    const result = SyncEventsRequestSchema.safeParse({
      matchId: MATCH_ID,
      events: [{ ...validEvent, kind: 'flying_kick' }],
    });
    expect(result.success).toBe(false);
  });
});
