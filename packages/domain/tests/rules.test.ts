import { describe, expect, it } from 'vitest';
import { evaluateMatch, shouldReopen } from '../src/scoring/rules';
import { aggregateScores } from '../src/scoring/score';
import type { MatchSettings, ScoringEvent } from '../src/types';

const SETTINGS: MatchSettings = {
  durationSec: 180,
  targetScore: 8,
  pointGap: 8,
  senshuEnabled: true,
};

// remainingMs defaults high so events don't trip the last-15s rule unless set.
function ev(
  partial: Partial<ScoringEvent> & Pick<ScoringEvent, 'side' | 'kind'>,
): ScoringEvent {
  return { id: 'e', matchId: 'm', occurredAtMs: 0, remainingMs: 120_000, ...partial };
}

const IN_TIME = 5_000;
const TIME_UP = 180_000;

describe('evaluateMatch — in progress', () => {
  it('is in_progress with no events and time remaining', () => {
    expect(evaluateMatch({ events: [], settings: SETTINGS, elapsedMs: IN_TIME }))
      .toEqual({ status: 'in_progress' });
  });

  it('stays in_progress with a small lead and time remaining', () => {
    const events = [ev({ side: 'AKA', kind: 'yuko' })];
    expect(evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME }).status)
      .toBe('in_progress');
  });
});

describe('evaluateMatch — end conditions', () => {
  it('decides by point_gap when the gap alone triggers (target higher than gap)', () => {
    // targetScore 12, pointGap 6: AO 6-0 opens a 6-gap without anyone reaching 12.
    const settings = { ...SETTINGS, targetScore: 12, pointGap: 6 };
    const events = Array.from({ length: 3 }, () => ev({ side: 'AO', kind: 'waza_ari' }));
    const r = evaluateMatch({ events, settings, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'point_gap' });
  });

  it('decides by target_score when a side reaches 8 without an 8-gap', () => {
    // AKA 8 (ippon+ippon+waza_ari), AO 1 -> gap 7 < 8, target hit.
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'target_score' });
  });

  it('prefers target_score over point_gap when both trigger at once', () => {
    // targetScore = pointGap = 8: AKA 8-0 satisfies both. Mock checks target first.
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'waza_ari' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'target_score' });
  });

  it('decides by time_up when one side leads at expiry', () => {
    const events = [ev({ side: 'AKA', kind: 'yuko' })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: TIME_UP });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'time_up' });
  });

  it('a last-15s penalty bonus can itself open a deciding point_gap', () => {
    // targetScore 12, pointGap 8. AO at 4; AKA takes a non-atesugi penalty in the
    // last 15s -> AO +4 = 8, gap 8 >= 8 decides for AO without reaching target.
    const settings = { ...SETTINGS, targetScore: 12, pointGap: 8 };
    const events = [
      ev({ side: 'AO', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'waza_ari' }),
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai', remainingMs: 8_000 }),
    ];
    const r = evaluateMatch({ events, settings, elapsedMs: 172_000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'point_gap' });
  });
});

describe('evaluateMatch — disqualification (c >= 5)', () => {
  it('opponent wins by hansoku when a side reaches 5 penalties', () => {
    const events = Array.from({ length: 5 }, () =>
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai' }),
    );
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'hansoku' });
  });

  it('10-count penalty is an instant disqualification', () => {
    const events = [ev({ side: 'AO', kind: 'c', penaltyReason: 'ten_count' })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'hansoku' });
  });

  it('both disqualified is a draw', () => {
    const events = [
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'ten_count' }),
      ev({ side: 'AO', kind: 'c', penaltyReason: 'ten_count' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: IN_TIME });
    expect(r).toMatchObject({ status: 'decided', winnerId: null, reason: 'hansoku' });
  });
});

describe('evaluateMatch — tie-break order', () => {
  const tied2each = (): ScoringEvent[] => [
    ev({ side: 'AKA', kind: 'waza_ari' }),
    ev({ side: 'AO', kind: 'waza_ari' }),
  ];

  it('senshu holder wins a tie when senshu is enabled', () => {
    const r = evaluateMatch({
      events: tied2each(), settings: SETTINGS, elapsedMs: TIME_UP, senshuHolder: 'AO',
    });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'senshu' });
  });

  it('senshu is ignored when settings.senshuEnabled is false', () => {
    const r = evaluateMatch({
      events: tied2each(),
      settings: { ...SETTINGS, senshuEnabled: false },
      elapsedMs: TIME_UP,
      senshuHolder: 'AO',
    });
    // Falls through to ippon/waza-ari (both equal) -> hantei.
    expect(r.status).toBe('hantei_required');
  });

  it('breaks a tie by more ippon when no senshu', () => {
    // Both total 3: AKA one ippon(3), AO waza_ari(2)+yuko(1). AKA has more ippon.
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AO', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: TIME_UP });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'ippon_count' });
  });

  it('breaks a tie by more waza-ari when ippon count equal', () => {
    // Both total 4, both zero ippon: AKA waza_ari+waza_ari(4), AO waza_ari+yuko+yuko(4).
    const events = [
      ev({ side: 'AKA', kind: 'waza_ari' }),
      ev({ side: 'AKA', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'waza_ari' }),
      ev({ side: 'AO', kind: 'yuko' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: TIME_UP });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'wazaari_count' });
  });

  it('requires hantei when total, ippon and waza-ari all tie', () => {
    const events = [
      ev({ side: 'AKA', kind: 'yuko' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: TIME_UP });
    expect(r).toMatchObject({ status: 'hantei_required', senshuHolder: null });
  });

  it('requires hantei on a 0-0 time-up', () => {
    const r = evaluateMatch({ events: [], settings: SETTINGS, elapsedMs: TIME_UP });
    expect(r.status).toBe('hantei_required');
  });
});

describe('shouldReopen — reverse recalculation', () => {
  it('reopens when deleting events clears every end condition', () => {
    // One yuko each: tied 1-1, within time, below target/gap, no DQ.
    const events = [
      ev({ side: 'AKA', kind: 'yuko' }),
      ev({ side: 'AO', kind: 'yuko' }),
    ];
    const s = aggregateScores(events);
    expect(shouldReopen(s.AKA, s.AO, SETTINGS, IN_TIME)).toBe(true);
  });

  it('does not reopen when a side is still disqualified', () => {
    const events = Array.from({ length: 5 }, () =>
      ev({ side: 'AKA', kind: 'c', penaltyReason: 'jogai' }),
    );
    const s = aggregateScores(events);
    expect(shouldReopen(s.AKA, s.AO, SETTINGS, IN_TIME)).toBe(false);
  });

  it('does not reopen once time is up', () => {
    const s = aggregateScores([]);
    expect(shouldReopen(s.AKA, s.AO, SETTINGS, TIME_UP)).toBe(false);
  });

  it('does not reopen while a side still sits at target score', () => {
    const events = [
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'ippon' }),
      ev({ side: 'AKA', kind: 'waza_ari' }), // AKA 8 == target
    ];
    const s = aggregateScores(events);
    expect(shouldReopen(s.AKA, s.AO, SETTINGS, IN_TIME)).toBe(false);
  });

  it('does not reopen while the point gap still holds', () => {
    const settings = { ...SETTINGS, targetScore: 12, pointGap: 6 };
    const events = Array.from({ length: 3 }, () => ev({ side: 'AO', kind: 'waza_ari' })); // gap 6
    const s = aggregateScores(events);
    expect(shouldReopen(s.AKA, s.AO, settings, IN_TIME)).toBe(false);
  });
});
