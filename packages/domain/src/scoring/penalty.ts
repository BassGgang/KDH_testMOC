import type { ScoreDetail } from '../types';
import { DISQUALIFY_C } from './score';

/**
 * NexTep uses a single unified category-penalty track shown as five dots.
 * The fifth penalty (c >= 5) is a disqualification; a 10-count reaches it in
 * one event (c += 5, see score.ts).
 */
export type PenaltyStatus =
  | 'none'
  | 'c1'
  | 'c2'
  | 'c3'
  | 'c4'
  | 'hansoku'; // c >= 5: disqualified

function statusForCount(count: number): PenaltyStatus {
  if (count <= 0) return 'none';
  if (count === 1) return 'c1';
  if (count === 2) return 'c2';
  if (count === 3) return 'c3';
  if (count === 4) return 'c4';
  return 'hansoku';
}

export interface PenaltyState {
  status: PenaltyStatus;
  /** Number of lit dots (capped at 5) for the UI. */
  count: number;
  isHansoku: boolean;
}

export function evaluatePenalty(detail: ScoreDetail): PenaltyState {
  const status = statusForCount(detail.c);
  return {
    status,
    count: Math.min(detail.c, DISQUALIFY_C),
    isHansoku: detail.c >= DISQUALIFY_C,
  };
}
