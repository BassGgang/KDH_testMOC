export type Rank = 'White' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Brown' | 'Black' | '1st Dan' | '2nd Dan' | '3rd Dan';

export interface Athlete {
  id: string;
  name: string;
  rank: Rank;
  affiliation: string;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    stamina: number;
    winRate: number;
  };
  history: {
    date: string;
    result: 'Win' | 'Loss';
    tournament: string;
    opponentName: string;
    score: string;
  }[];
}

export interface ScoreDetail {
  ippon: number; // 3 points
  wazaAri: number; // 2 points
  yuko: number; // 1 point
  c1: number; // Category 1 penalties
  c2: number; // Category 2 penalties
}

export interface MatchSettings {
  duration: number; // total seconds
  targetScore: number; // e.g., 8 points
  pointGap: number; // e.g., 8 points difference
  senshuEnabled: boolean;
}

export interface Match {
  id: string;
  tournamentId: string;
  type: 'Kumite' | 'Kata';
  round: number;
  athletes: [string, string]; // Athlete IDs
  scores: [ScoreDetail, ScoreDetail];
  winnerId?: string;
  referee: string;
  videoUrl?: string;
  startTime?: string;
  endTime?: string;
  status: 'Scheduled' | 'Live' | 'Completed';
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  category: string; // e.g., "Men's Kumite -75kg"
  status: 'Draft' | 'Ongoing' | 'Completed';
}
