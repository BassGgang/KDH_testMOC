import type {
  MatchSettings,
  ScoreDetail,
  ScoringEvent,
  Side,
  WinReason,
} from '../types';
import { aggregateScores, isDisqualified } from './score';

function opposite(side: Side): Side {
  return side === 'AKA' ? 'AO' : 'AKA';
}

export interface InProgressOutcome {
  status: 'in_progress';
}

export interface DecidedOutcome {
  status: 'decided';
  winnerId: Side | null;
  reason: WinReason;
  senshuHolder: Side | null;
}

export interface HanteiRequiredOutcome {
  status: 'hantei_required';
  senshuHolder: Side | null;
}

export type MatchOutcome =
  | InProgressOutcome
  | DecidedOutcome
  | HanteiRequiredOutcome;

export interface EvaluateMatchInput {
  events: ScoringEvent[];
  settings: MatchSettings;
  /** Elapsed time in ms from match start. Pass settings.durationSec*1000 to evaluate time-up. */
  elapsedMs: number;
  /**
   * Manually assigned senshu holder (referee toggle). Ignored when
   * settings.senshuEnabled is false.
   */
  senshuHolder?: Side | null;
}

/**
 * Break a tie when neither total nor senshu decides it (NexTep rule):
 *   1. more ippon
 *   2. more waza-ari
 *   3. otherwise HANTEI (referee vote required)
 */
function tieBreak(
  aka: ScoreDetail,
  ao: ScoreDetail,
): { winner: Side | null; reason: WinReason } {
  if (aka.ippon !== ao.ippon) {
    return { winner: aka.ippon > ao.ippon ? 'AKA' : 'AO', reason: 'ippon_count' };
  }
  if (aka.wazaAri !== ao.wazaAri) {
    return { winner: aka.wazaAri > ao.wazaAri ? 'AKA' : 'AO', reason: 'wazaari_count' };
  }
  return { winner: null, reason: 'hantei' };
}

/**
 * Whether a currently-terminated match should reopen because deleting events
 * (e.g. via the admin panel) has cleared every end condition. Mirrors the
 * mock's reverse-recalculation: time remaining AND both totals below target AND
 * gap below pointGap AND neither side disqualified.
 */
export function shouldReopen(
  aka: ScoreDetail,
  ao: ScoreDetail,
  settings: MatchSettings,
  elapsedMs: number,
): boolean {
  const timeRemaining = elapsedMs < settings.durationSec * 1000;
  return (
    timeRemaining &&
    aka.total < settings.targetScore &&
    ao.total < settings.targetScore &&
    Math.abs(aka.total - ao.total) < settings.pointGap &&
    !isDisqualified(aka) &&
    !isDisqualified(ao)
  );
}

/**
 * Determine the match outcome. Evaluation order (NexTep model):
 *   1. Disqualification (c >= 5): both -> draw, one -> opponent wins (hansoku)
 *   2. End conditions: target score, point gap, or time-up must hold for a
 *      decision; otherwise in_progress
 *   3. Decide by: highest total -> senshu (manual) -> ippon count ->
 *      waza-ari count -> HANTEI
 */
export function evaluateMatch(input: EvaluateMatchInput): MatchOutcome {
  const { events, settings, elapsedMs } = input;
  const scores = aggregateScores(events);
  const aka = scores.AKA;
  const ao = scores.AO;
  const senshu = settings.senshuEnabled ? input.senshuHolder ?? null : null;

  // 1. Disqualification by penalty accumulation.
  const akaDq = isDisqualified(aka);
  const aoDq = isDisqualified(ao);
  if (akaDq && aoDq) {
    return { status: 'decided', winnerId: null, reason: 'hansoku', senshuHolder: senshu };
  }
  if (akaDq) {
    return { status: 'decided', winnerId: 'AO', reason: 'hansoku', senshuHolder: senshu };
  }
  if (aoDq) {
    return { status: 'decided', winnerId: 'AKA', reason: 'hansoku', senshuHolder: senshu };
  }

  const diff = Math.abs(aka.total - ao.total);
  const targetReached = aka.total >= settings.targetScore || ao.total >= settings.targetScore;
  const gapReached = diff >= settings.pointGap;
  const timeUp = elapsedMs >= settings.durationSec * 1000;

  // 2. No end condition met -> still in progress.
  if (!targetReached && !gapReached && !timeUp) {
    return { status: 'in_progress' };
  }

  // Reason precedence mirrors the mock's end-condition useEffect:
  //   Condition 1 = target score, Condition 2 = point gap, Condition 3 = time-up.
  const reason: WinReason = targetReached
    ? 'target_score'
    : gapReached
      ? 'point_gap'
      : 'time_up';

  // 3a. Decided by points.
  if (aka.total !== ao.total) {
    return {
      status: 'decided',
      winnerId: aka.total > ao.total ? 'AKA' : 'AO',
      reason,
      senshuHolder: senshu,
    };
  }

  // 3b. Tied: senshu holder wins.
  if (senshu !== null) {
    return { status: 'decided', winnerId: senshu, reason: 'senshu', senshuHolder: senshu };
  }

  // 3c. Tied, no senshu: ippon count -> waza-ari count -> HANTEI.
  const tb = tieBreak(aka, ao);
  if (tb.winner === null) {
    return { status: 'hantei_required', senshuHolder: senshu };
  }
  return { status: 'decided', winnerId: tb.winner, reason: tb.reason, senshuHolder: senshu };
}
