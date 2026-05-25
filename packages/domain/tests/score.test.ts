import { describe, expect, it } from 'vitest';
import { aggregateScores, totalPoints } from '../src/scoring/score';
import type { ScoringEvent } from '../src/types';

function ev(partial: Partial<ScoringEvent> & Pick<ScoringEvent, 'side' | 'kind'>): ScoringEvent {
  return {
    id: 'e',
    matchId: 'm',
    occurredAtMs: 0,
    ...partial,
  };
}

describe('aggregateScores', () => {
  it('returns zero detail for empty event list', () => {
    const result = aggregateScores([]);
    expect(result.AKA).toEqual({ ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0 });
    expect(result.AO).toEqual({ ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0 });
  });

  it('counts ippon, waza_ari, yuko per side', () => {
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'yuko' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = aggregateScores(events);
    expect(r.AKA).toMatchObject({ ippon: 1, wazaAri: 1, yuko: 0 });
    expect(r.AO).toMatchObject({ ippon: 0, wazaAri: 0, yuko: 2 });
  });

  it('counts c1 and c2 penalties per side', () => {
    const events = [
      ev({ side: 'AKA', kind: 'c1' }),
      ev({ side: 'AKA', kind: 'c2' }),
      ev({ side: 'AO', kind: 'c1' }),
    ];
    const r = aggregateScores(events);
    expect(r.AKA.c1).toBe(1);
    expect(r.AKA.c2).toBe(1);
    expect(r.AO.c1).toBe(1);
    expect(r.AO.c2).toBe(0);
  });

  it('ignores hansoku/kiken/shikkaku events in detail tallies', () => {
    const events = [
      ev({ side: 'AKA', kind: 'hansoku' }),
      ev({ side: 'AO', kind: 'kiken' }),
      ev({ side: 'AKA', kind: 'shikkaku' }),
    ];
    const r = aggregateScores(events);
    expect(r.AKA).toEqual({ ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0 });
    expect(r.AO).toEqual({ ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0 });
  });
});

describe('totalPoints', () => {
  it('calculates points: ippon=3, waza_ari=2, yuko=1', () => {
    expect(totalPoints({ ippon: 1, wazaAri: 0, yuko: 0, c1: 0, c2: 0 })).toBe(3);
    expect(totalPoints({ ippon: 0, wazaAri: 1, yuko: 0, c1: 0, c2: 0 })).toBe(2);
    expect(totalPoints({ ippon: 0, wazaAri: 0, yuko: 1, c1: 0, c2: 0 })).toBe(1);
  });

  it('sums mixed events correctly', () => {
    expect(totalPoints({ ippon: 2, wazaAri: 1, yuko: 3, c1: 5, c2: 5 })).toBe(11);
  });

  it('returns 0 for empty detail', () => {
    expect(totalPoints({ ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0 })).toBe(0);
  });
});
