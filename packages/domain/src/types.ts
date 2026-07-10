export type Rank =
  | 'White' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Brown' | 'Black'
  | '1st Dan' | '2nd Dan' | '3rd Dan';

export type Side = 'AKA' | 'AO';

export type ScoringEventKind =
  | 'ippon'      // 3 points
  | 'waza_ari'   // 2 points
  | 'yuko'       // 1 point
  | 'c';         // Category penalty (unified). c >= 5 disqualifies; 10-count adds 5.

/**
 * Penalty reasons for a `c` event. The last-15-second rule and the
 * instant-disqualification rule branch on these values, so they are a closed
 * enum rather than free text.
 */
export type PenaltyReason =
  | 'atesugi'        // 当てすぎ: excessive contact
  | 'jogai'          // 場外: out of bounds
  | 'time_wasting'   // 時間の空費
  | 'mubobi'         // 無防備: no self-protection
  | 'grabbing'       // 相手のつかみすぎ
  | 'other'          // その他のマナー違反
  | 'ten_count';     // 10カウント: instant disqualification (c += 5)

export interface ScoringEvent {
  id: string;
  matchId: string;
  side: Side;
  kind: ScoringEventKind;
  /** Target zone for point events (jodan/chudan). Undefined for penalties. */
  target?: 'jodan' | 'chudan';
  /** Technique for point events (tsuki/keri). Undefined for penalties. */
  technique?: 'tsuki' | 'keri';
  /** Reason for `c` penalties; required when kind === 'c'. */
  penaltyReason?: PenaltyReason;
  /** Elapsed time in ms from match start. */
  occurredAtMs: number;
  /** Remaining time in ms at the moment of the event. Drives the last-15s rule. */
  remainingMs: number;
}

export interface ScoreDetail {
  ippon: number;
  wazaAri: number;
  yuko: number;
  /** Unified category-penalty count. */
  c: number;
  /** Total points including opponent bonuses awarded by the last-15s rule. */
  total: number;
}

export interface MatchSettings {
  durationSec: number;
  targetScore: number;
  pointGap: number;
  senshuEnabled: boolean;
}

export type WinReason =
  | 'point_gap'
  | 'target_score'
  | 'time_up'
  | 'hansoku'        // opponent disqualified (c >= 5)
  | 'senshu'         // tie broken by senshu holder
  | 'ippon_count'    // tie broken by number of ippon
  | 'wazaari_count'  // tie broken by number of waza-ari
  | 'hantei';        // requires referee vote

export interface MatchResult {
  winnerId: string | null;
  reason: WinReason;
  senshuHolder: Side | null;
}
