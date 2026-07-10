import { describe, expect, it } from 'vitest';
import { aggregateScores, isDisqualified, totalPoints } from '../src/scoring/score';
import type { ScoringEvent } from '../src/types';

function ev(
  partial: Partial<ScoringEvent> & Pick<ScoringEvent, 'side' | 'kind'>,
): ScoringEvent {
  return { id: 'e', matchId: 'm', occurredAtMs: 0, remainingMs: 120_000, ...partial };
}

const EMPTY = { ippon: 0, wazaAri: 0, yuko: 0, c: 0, total: 0 };

describe('aggregateScores — points', () => {
  it('returns zero detail for an empty event list', () => {
    const r = aggregateScores([]);
    expect(r.AKA).toEqual(EMPTY);
    expect(r.AO).toEqual(EMPTY);
  });

  it('counts and totals ippon(3)/waza_ari(2)/yuko(1) per side', () => {
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'yuko' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = aggregateScores(events);
    expect(r.AKA).toMatchObject({ ippon: 1, wazaAri: 1, yuko: 0, total: 5 });
    expect(r.AO).toMatchObject({ ippon: 0, wazaAri: 0, yuko: 2, total: 2 });
  });
});

describe('aggregateScores — penalties', () => {
  it('increments c by 1 for a normal penalty', () => {
    const r = aggregateScores([ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai' })]);
    expect(r.AKA.c).toBe(1);
    expect(r.AKA.total).toBe(0);
  });

  it('a 10-count adds 5 to c (instant disqualification)', () => {
    const r = aggregateScores([ev({ side: 'AO', kind: 'c', penaltyReason: 'ten_count' })]);
    expect(r.AO.c).toBe(5);
    expect(isDisqualified(r.AO)).toBe(true);
  });

  it('a 10-count never grants an opponent bonus even in the last 15s', () => {
    const r = aggregateScores([
      ev({ side: 'AO', kind: 'c', penaltyReason: 'ten_count', remainingMs: 3_000 }),
    ]);
    expect(r.AKA.total).toBe(0);
  });
});

describe('aggregateScores — last-15s opponent bonus', () => {
  it('awards the opponent +4 for a non-atesugi penalty in the last 15s', () => {
    const r = aggregateScores([
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai', remainingMs: 10_000 }),
    ]);
    expect(r.AKA.c).toBe(1);
    expect(r.AO.total).toBe(4);
  });

  it('awards the opponent +1 for an atesugi penalty in the last 15s', () => {
    const r = aggregateScores([
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'atesugi', remainingMs: 5_000 }),
    ]);
    expect(r.AO.total).toBe(1);
  });

  it('grants no bonus when remainingMs is above the 15s window', () => {
    const r = aggregateScores([
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai', remainingMs: 15_001 }),
    ]);
    expect(r.AO.total).toBe(0);
  });

  it('grants a bonus exactly at the 15s boundary (inclusive)', () => {
    const r = aggregateScores([
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai', remainingMs: 15_000 }),
    ]);
    expect(r.AO.total).toBe(4);
  });
});

describe('totalPoints & isDisqualified', () => {
  it('totalPoints reads the precomputed total', () => {
    expect(totalPoints({ ...EMPTY, total: 7 })).toBe(7);
  });

  it('isDisqualified is true at c >= 5', () => {
    expect(isDisqualified({ ...EMPTY, c: 4 })).toBe(false);
    expect(isDisqualified({ ...EMPTY, c: 5 })).toBe(true);
  });
});
