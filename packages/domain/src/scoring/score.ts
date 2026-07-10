import type { ScoreDetail, ScoringEvent, Side } from '../types';

export const POINT_VALUES = {
  ippon: 3,
  waza_ari: 2,
  yuko: 1,
} as const;

/** A `c` event this many ms or fewer from the end awards points to the opponent. */
export const LAST_SECONDS_WINDOW_MS = 15_000;
/** Opponent bonus for a last-15s penalty other than atesugi. */
export const LAST_SECONDS_BONUS = 4;
/** Opponent bonus for a last-15s atesugi penalty. */
export const LAST_SECONDS_BONUS_ATESUGI = 1;
/** A 10-count penalty adds this to the `c` count, forcing an immediate loss. */
export const TEN_COUNT_PENALTY = 5;
/** Disqualification threshold for the unified `c` count. */
export const DISQUALIFY_C = 5;

function emptyDetail(): ScoreDetail {
  return { ippon: 0, wazaAri: 0, yuko: 0, c: 0, total: 0 };
}

function opposite(side: Side): Side {
  return side === 'AKA' ? 'AO' : 'AKA';
}

/**
 * Aggregate the event stream into per-side score details, faithful to the
 * NexTep scoring model:
 *   - ippon +3, waza-ari +2, yuko +1
 *   - a `c` penalty increments `c` by 1 (or by 5 for a 10-count)
 *   - a non-10-count `c` in the last 15 seconds awards the opponent
 *     +1 (atesugi) or +4 (anything else)
 */
export function aggregateScores(events: ScoringEvent[]): Record<Side, ScoreDetail> {
  const result: Record<Side, ScoreDetail> = {
    AKA: emptyDetail(),
    AO: emptyDetail(),
  };

  for (const ev of events) {
    const detail = result[ev.side];
    switch (ev.kind) {
      case 'ippon':
        detail.ippon++;
        detail.total += POINT_VALUES.ippon;
        break;
      case 'waza_ari':
        detail.wazaAri++;
        detail.total += POINT_VALUES.waza_ari;
        break;
      case 'yuko':
        detail.yuko++;
        detail.total += POINT_VALUES.yuko;
        break;
      case 'c':
        if (ev.penaltyReason === 'ten_count') {
          detail.c += TEN_COUNT_PENALTY;
        } else {
          detail.c++;
          if (ev.remainingMs <= LAST_SECONDS_WINDOW_MS) {
            result[opposite(ev.side)].total +=
              ev.penaltyReason === 'atesugi'
                ? LAST_SECONDS_BONUS_ATESUGI
                : LAST_SECONDS_BONUS;
          }
        }
        break;
    }
  }

  return result;
}

/** Total points for a side (already includes last-15s opponent bonuses). */
export function totalPoints(detail: ScoreDetail): number {
  return detail.total;
}

/** Whether this side is disqualified by penalty accumulation. */
export function isDisqualified(detail: ScoreDetail): boolean {
  return detail.c >= DISQUALIFY_C;
}
