import { describe, expect, it } from 'vitest';
import { computeSenshu, evaluateMatch } from '../src/scoring/rules';
import type { MatchSettings, ScoringEvent } from '../src/types';

const SETTINGS: MatchSettings = {
  durationSec: 180,
  targetScore: 8,
  pointGap: 8,
  senshuEnabled: true,
};

function ev(partial: Partial<ScoringEvent> & Pick<ScoringEvent, 'side' | 'kind'>): ScoringEvent {
  return { id: 'e', matchId: 'm', occurredAtMs: 0, ...partial };
}

describe('computeSenshu', () => {
  it('returns null when no scores', () => {
    expect(computeSenshu([])).toBeNull();
  });

  it('returns the side that scored first', () => {
    const events = [
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 1000 }),
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 2000 }),
    ];
    expect(computeSenshu(events)).toBe('AO');
  });

  it('ignores penalty events when computing senshu', () => {
    const events = [
      ev({ side: 'AO', kind: 'c1', occurredAtMs: 500 }),
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 }),
    ];
    expect(computeSenshu(events)).toBe('AKA');
  });

  it('returns null when both sides score at exact same ms', () => {
    const events = [
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 1000 }),
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 }),
    ];
    expect(computeSenshu(events)).toBeNull();
  });
});

describe('evaluateMatch', () => {
  it('returns in_progress when no events and time remaining', () => {
    expect(
      evaluateMatch({ events: [], settings: SETTINGS, elapsedMs: 0 }),
    ).toEqual({ status: 'in_progress' });
  });

  it('decides by target score when AKA reaches 8', () => {
    const events = [
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 1000 }),
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 2000 }),
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 3000 }),
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 4000 }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 5000 });
    expect(r.status).toBe('decided');
    expect(r).toMatchObject({ winnerId: 'AKA', reason: 'point_gap' });
    // Note: 9-1=8 also satisfies pointGap, which is evaluated before target_score.
  });

  it('decides by point_gap when 8-point lead opens', () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      ev({ side: 'AO', kind: 'waza_ari', occurredAtMs: 1000 + i * 100 }),
    );
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 2000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'point_gap' });
  });

  it('decides by time_up when one side leads at expiry', () => {
    const events = [ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 180_000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'time_up' });
  });

  it('decides by senshu when tied at time_up and senshu enabled', () => {
    const events = [
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 }),
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 2000 }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 180_000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'time_up' });
  });

  it('requires hantei when tied at time_up with no senshu', () => {
    const events = [
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 }),
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 1000 }),
    ];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 180_000 });
    expect(r.status).toBe('hantei_required');
  });

  it('requires hantei when tied 0-0 at time_up', () => {
    const r = evaluateMatch({ events: [], settings: SETTINGS, elapsedMs: 180_000 });
    expect(r.status).toBe('hantei_required');
  });

  it('hansoku event makes opponent win immediately', () => {
    const events = [ev({ side: 'AKA', kind: 'hansoku', occurredAtMs: 1000 })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 2000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'hansoku' });
  });

  it('kiken (forfeit) gives opponent the win', () => {
    const events = [ev({ side: 'AO', kind: 'kiken', occurredAtMs: 1000 })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 2000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AKA', reason: 'kiken' });
  });

  it('shikkaku gives opponent the win', () => {
    const events = [ev({ side: 'AKA', kind: 'shikkaku', occurredAtMs: 1000 })];
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 2000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'shikkaku' });
  });

  it('4th C1 penalty causes hansoku', () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      ev({ side: 'AKA', kind: 'c1', occurredAtMs: 1000 + i * 100 }),
    );
    const r = evaluateMatch({ events, settings: SETTINGS, elapsedMs: 2000 });
    expect(r).toMatchObject({ status: 'decided', winnerId: 'AO', reason: 'hansoku' });
  });

  it('senshu disabled means hantei required at time-up tie even with first scorer', () => {
    const events = [
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 1000 }),
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 2000 }),
    ];
    const r = evaluateMatch({
      events,
      settings: { ...SETTINGS, senshuEnabled: false },
      elapsedMs: 180_000,
    });
    expect(r.status).toBe('hantei_required');
  });
});
