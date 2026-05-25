import type { ScoringEvent, Side } from '../types';
import { aggregateScores, totalPoints } from '../scoring/score';

/**
 * Summary of a single match from one athlete's perspective.
 * Produced by summarizeMatch() and consumed by computeAthleteStats().
 */
export interface MatchSummary {
  matchId: string;
  side: Side;
  ownScore: number;
  opponentScore: number;
  durationSec: number;
  firstScoreMs: number | null;            // null if the athlete never scored
  ownSecondHalfPoints: number;             // points scored in the latter half of duration
  isWin: boolean;
}

export function summarizeMatch(input: {
  matchId: string;
  side: Side;
  events: ScoringEvent[];
  durationSec: number;
  winnerSide: Side | null;                 // null means draw / hantei not decided in favor
}): MatchSummary {
  const { matchId, side, events, durationSec, winnerSide } = input;
  const scores = aggregateScores(events);
  const ownScore = totalPoints(scores[side]);
  const oppSide: Side = side === 'AKA' ? 'AO' : 'AKA';
  const opponentScore = totalPoints(scores[oppSide]);

  const halfMs = (durationSec * 1000) / 2;
  const ownScoringEvents = events
    .filter((e) => e.side === side && (e.kind === 'ippon' || e.kind === 'waza_ari' || e.kind === 'yuko'))
    .sort((a, b) => a.occurredAtMs - b.occurredAtMs);

  const firstScoreMs = ownScoringEvents[0]?.occurredAtMs ?? null;

  const ownSecondHalfPoints = ownScoringEvents
    .filter((e) => e.occurredAtMs >= halfMs)
    .reduce((sum, e) => sum + pointValue(e.kind), 0);

  return {
    matchId,
    side,
    ownScore,
    opponentScore,
    durationSec,
    firstScoreMs,
    ownSecondHalfPoints,
    isWin: winnerSide === side,
  };
}

function pointValue(kind: ScoringEvent['kind']): number {
  if (kind === 'ippon') return 3;
  if (kind === 'waza_ari') return 2;
  if (kind === 'yuko') return 1;
  return 0;
}

export interface AthleteStats {
  attack: number;       // 0-100
  defense: number;      // 0-100
  speed: number;        // 0-100
  stamina: number;      // 0-100
  winRate: number;      // 0-100
  matchCount: number;
}

const EMPTY_STATS: AthleteStats = {
  attack: 0, defense: 0, speed: 0, stamina: 0, winRate: 0, matchCount: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Provisional stats calculation. The formulas here are placeholders and will be
 * revisited with a karate domain expert (see ARCHITECTURE.md §13).
 */
export function computeAthleteStats(matches: MatchSummary[]): AthleteStats {
  if (matches.length === 0) return EMPTY_STATS;

  const matchCount = matches.length;
  const totalDurationMin = matches.reduce((s, m) => s + m.durationSec / 60, 0);
  const totalOwnScore = matches.reduce((s, m) => s + m.ownScore, 0);
  const totalOppScore = matches.reduce((s, m) => s + m.opponentScore, 0);
  const wins = matches.filter((m) => m.isWin).length;

  const ratePerMin = (total: number) => total / Math.max(totalDurationMin, 1e-6);

  const attack = clamp(ratePerMin(totalOwnScore) * 25, 0, 100);
  const defense = clamp(100 - ratePerMin(totalOppScore) * 25, 0, 100);

  // Speed: inverse of average first-score time, scaled. Matches where the
  // athlete never scored are excluded so they don't artificially worsen the metric.
  const firstScoreTimes = matches
    .map((m) => m.firstScoreMs)
    .filter((v): v is number => v != null)
    .map((v) => v / 1000);
  const avgFirstScoreSec = firstScoreTimes.length
    ? firstScoreTimes.reduce((s, t) => s + t, 0) / firstScoreTimes.length
    : Infinity;
  const speed = clamp(120 - avgFirstScoreSec, 0, 100);

  // Stamina: share of points scored in the latter half of matches.
  const secondHalfPoints = matches.reduce((s, m) => s + m.ownSecondHalfPoints, 0);
  const stamina = totalOwnScore === 0
    ? 0
    : clamp((secondHalfPoints / totalOwnScore) * 100, 0, 100);

  const winRate = clamp((wins / matchCount) * 100, 0, 100);

  return {
    attack:   round1(attack),
    defense:  round1(defense),
    speed:    round1(speed),
    stamina:  round1(stamina),
    winRate:  round1(winRate),
    matchCount,
  };
}
