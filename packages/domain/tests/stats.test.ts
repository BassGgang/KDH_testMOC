import { describe, expect, it } from 'vitest';
import {
  computeAthleteStats, summarizeMatch, type MatchSummary,
} from '../src/analytics/stats';
import type { ScoringEvent } from '../src/types';

function ev(partial: Partial<ScoringEvent> & Pick<ScoringEvent, 'side' | 'kind'>): ScoringEvent {
  return { id: 'e', matchId: 'm', occurredAtMs: 0, ...partial };
}

describe('summarizeMatch', () => {
  it('counts own and opponent scores per side', () => {
    const events = [
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 1000 }),
      ev({ side: 'AO', kind: 'yuko', occurredAtMs: 2000 }),
    ];
    const summary = summarizeMatch({
      matchId: 'm1', side: 'AKA', events, durationSec: 180, winnerSide: 'AKA',
    });
    expect(summary.ownScore).toBe(3);
    expect(summary.opponentScore).toBe(1);
    expect(summary.isWin).toBe(true);
    expect(summary.firstScoreMs).toBe(1000);
  });

  it('reports null firstScoreMs when athlete did not score', () => {
    const events = [ev({ side: 'AO', kind: 'ippon', occurredAtMs: 1000 })];
    const summary = summarizeMatch({
      matchId: 'm1', side: 'AKA', events, durationSec: 180, winnerSide: 'AO',
    });
    expect(summary.firstScoreMs).toBeNull();
    expect(summary.ownScore).toBe(0);
    expect(summary.isWin).toBe(false);
  });

  it('counts second-half points correctly', () => {
    // duration 180s -> halfMs = 90000
    const events = [
      ev({ side: 'AKA', kind: 'yuko', occurredAtMs: 30_000 }),      // first half
      ev({ side: 'AKA', kind: 'waza_ari', occurredAtMs: 120_000 }), // second half
      ev({ side: 'AKA', kind: 'ippon', occurredAtMs: 150_000 }),    // second half
    ];
    const summary = summarizeMatch({
      matchId: 'm1', side: 'AKA', events, durationSec: 180, winnerSide: 'AKA',
    });
    expect(summary.ownScore).toBe(6);              // 1+2+3
    expect(summary.ownSecondHalfPoints).toBe(5);   // 2+3
  });
});

describe('computeAthleteStats', () => {
  it('returns zeros for empty input', () => {
    expect(computeAthleteStats([])).toEqual({
      attack: 0, defense: 0, speed: 0, stamina: 0, winRate: 0, matchCount: 0,
    });
  });

  it('winRate is 100 when athlete won all matches', () => {
    const matches: MatchSummary[] = [
      { matchId: 'a', side: 'AKA', ownScore: 5, opponentScore: 2, durationSec: 180, firstScoreMs: 10_000, ownSecondHalfPoints: 2, isWin: true },
      { matchId: 'b', side: 'AKA', ownScore: 4, opponentScore: 1, durationSec: 180, firstScoreMs: 20_000, ownSecondHalfPoints: 1, isWin: true },
    ];
    const stats = computeAthleteStats(matches);
    expect(stats.winRate).toBe(100);
    expect(stats.matchCount).toBe(2);
  });

  it('winRate is 0 when athlete lost all matches', () => {
    const matches: MatchSummary[] = [
      { matchId: 'a', side: 'AKA', ownScore: 0, opponentScore: 5, durationSec: 180, firstScoreMs: null, ownSecondHalfPoints: 0, isWin: false },
    ];
    expect(computeAthleteStats(matches).winRate).toBe(0);
  });

  it('attack scales with average points per minute', () => {
    const low: MatchSummary = { matchId: 'a', side: 'AKA', ownScore: 1, opponentScore: 0, durationSec: 180, firstScoreMs: 30_000, ownSecondHalfPoints: 0, isWin: true };
    const high: MatchSummary = { matchId: 'b', side: 'AKA', ownScore: 8, opponentScore: 0, durationSec: 180, firstScoreMs: 30_000, ownSecondHalfPoints: 0, isWin: true };
    expect(computeAthleteStats([high]).attack).toBeGreaterThan(computeAthleteStats([low]).attack);
  });

  it('clamps every metric to [0, 100]', () => {
    const matches: MatchSummary[] = Array.from({ length: 5 }, (_, i) => ({
      matchId: `m${i}`, side: 'AKA' as const, ownScore: 100, opponentScore: 0,
      durationSec: 60, firstScoreMs: 0, ownSecondHalfPoints: 50, isWin: true,
    }));
    const stats = computeAthleteStats(matches);
    for (const k of ['attack', 'defense', 'speed', 'stamina', 'winRate'] as const) {
      expect(stats[k]).toBeGreaterThanOrEqual(0);
      expect(stats[k]).toBeLessThanOrEqual(100);
    }
  });
});
