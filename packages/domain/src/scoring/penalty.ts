import type { ScoreDetail } from '../types';

export type PenaltyStatus =
  | 'none'
  | 'chukoku'        // 1st: warning, no points
  | 'keikoku'        // 2nd: warning, no points
  | 'hansoku_chui'   // 3rd: final warning
  | 'hansoku';       // 4th: disqualification

// Modern WKF (post-2020): each category (C1 and C2) accumulates independently
// in the progression chukoku -> keikoku -> hansoku_chui -> hansoku.
// Hansoku triggers an immediate loss.
function statusForCount(count: number): PenaltyStatus {
  if (count <= 0) return 'none';
  if (count === 1) return 'chukoku';
  if (count === 2) return 'keikoku';
  if (count === 3) return 'hansoku_chui';
  return 'hansoku';
}

export interface PenaltyState {
  c1Status: PenaltyStatus;
  c2Status: PenaltyStatus;
  isHansoku: boolean;
}

export function evaluatePenalty(detail: ScoreDetail): PenaltyState {
  const c1Status = statusForCount(detail.c1);
  const c2Status = statusForCount(detail.c2);
  return {
    c1Status,
    c2Status,
    isHansoku: c1Status === 'hansoku' || c2Status === 'hansoku',
  };
}
