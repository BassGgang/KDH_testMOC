import type {
  MatchSettings,
  ScoringEvent,
  Side,
  WinReason,
} from '../types';
import { aggregateScores, totalPoints } from './score';
import { evaluatePenalty } from './penalty';

const POINT_KINDS = new Set(['ippon', 'waza_ari', 'yuko']);

function opposite(side: Side): Side {
  return side === 'AKA' ? 'AO' : 'AKA';
}

/**
 * Senshu: side that scored the first unanswered point from a scoring technique.
 * Penalty-derived points are excluded. Returns null if neither side has scored
 * a technique-based point or if both scored at the same instant.
 */
export function computeSenshu(events: ScoringEvent[]): Side | null {
  const techniqueScores = events
    .filter((e) => POINT_KINDS.has(e.kind))
    .sort((a, b) => a.occurredAtMs - b.occurredAtMs);

  if (techniqueScores.length === 0) return null;

  const first = techniqueScores[0]!;
  // If multiple events occurred at the same instant (e.g. simultaneous score),
  // senshu is not awarded.
  const tied = techniqueScores.some(
    (e) => e !== first && e.occurredAtMs === first.occurredAtMs && e.side !== first.side,
  );
  if (tied) return null;

  return first.side;
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
}

/**
 * Determine the current match outcome given the event stream and elapsed time.
 *
 * Evaluation order (per WKF Kumite):
 *   1. Immediate disqualifications (hansoku/shikkaku/kiken events)
 *   2. Penalty accumulation reaching hansoku
 *   3. Point-gap reached (settings.pointGap)
 *   4. Target score reached (settings.targetScore)
 *   5. Time up: by points, then senshu (if enabled), then hantei
 *   6. Otherwise: in_progress
 */
export function evaluateMatch(input: EvaluateMatchInput): MatchOutcome {
  const { events, settings, elapsedMs } = input;
  const scores = aggregateScores(events);
  const senshu = settings.senshuEnabled ? computeSenshu(events) : null;

  // 1. Explicit termination events. Most recent wins ordering does not matter
  //    here; any such event ends the match.
  for (const ev of events) {
    if (ev.kind === 'hansoku' || ev.kind === 'shikkaku' || ev.kind === 'kiken') {
      return {
        status: 'decided',
        winnerId: opposite(ev.side),
        reason: ev.kind,
        senshuHolder: senshu,
      };
    }
  }

  // 2. Penalty accumulation causing hansoku.
  for (const side of ['AKA', 'AO'] as Side[]) {
    if (evaluatePenalty(scores[side]).isHansoku) {
      return {
        status: 'decided',
        winnerId: opposite(side),
        reason: 'hansoku',
        senshuHolder: senshu,
      };
    }
  }

  const akaPts = totalPoints(scores.AKA);
  const aoPts = totalPoints(scores.AO);
  const diff = Math.abs(akaPts - aoPts);

  // 3. Point gap.
  if (diff >= settings.pointGap) {
    return {
      status: 'decided',
      winnerId: akaPts > aoPts ? 'AKA' : 'AO',
      reason: 'point_gap',
      senshuHolder: senshu,
    };
  }

  // 4. Target score.
  if (akaPts >= settings.targetScore || aoPts >= settings.targetScore) {
    return {
      status: 'decided',
      winnerId: akaPts > aoPts ? 'AKA' : akaPts < aoPts ? 'AO' : null,
      reason: 'target_score',
      senshuHolder: senshu,
    };
  }

  // 5. Time still remaining.
  if (elapsedMs < settings.durationSec * 1000) {
    return { status: 'in_progress' };
  }

  // 6. Time up.
  if (akaPts !== aoPts) {
    return {
      status: 'decided',
      winnerId: akaPts > aoPts ? 'AKA' : 'AO',
      reason: 'time_up',
      senshuHolder: senshu,
    };
  }

  // Tied at time-up.
  if (settings.senshuEnabled && senshu !== null) {
    return {
      status: 'decided',
      winnerId: senshu,
      reason: 'time_up',
      senshuHolder: senshu,
    };
  }

  // Manual judge decision required.
  return { status: 'hantei_required', senshuHolder: senshu };
}
