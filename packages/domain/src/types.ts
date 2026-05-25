export type Rank =
  | 'White' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Brown' | 'Black'
  | '1st Dan' | '2nd Dan' | '3rd Dan';

export type Side = 'AKA' | 'AO';

export type ScoringEventKind =
  | 'ippon'      // 3 points
  | 'waza_ari'   // 2 points
  | 'yuko'       // 1 point
  | 'c1'         // Category 1 penalty
  | 'c2'         // Category 2 penalty
  | 'hansoku'    // disqualification
  | 'kiken'      // forfeit
  | 'shikkaku';  // serious misconduct disqualification

export interface ScoringEvent {
  id: string;
  matchId: string;
  side: Side;
  kind: ScoringEventKind;
  technique?: string;
  occurredAtMs: number;
}

export interface ScoreDetail {
  ippon: number;
  wazaAri: number;
  yuko: number;
  c1: number;
  c2: number;
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
  | 'hansoku'
  | 'kiken'
  | 'shikkaku'
  | 'hantei';

export interface MatchResult {
  winnerId: string | null;
  reason: WinReason;
  senshuHolder: Side | null;
}
