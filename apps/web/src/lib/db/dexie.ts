import Dexie, { type EntityTable } from 'dexie';
import type { MatchSettings, Side, ScoringEventKind } from '@karate/domain';

export interface LocalMatch {
  id: string;                      // UUID, client-generated
  status: 'in_progress' | 'finished' | 'synced';
  type: 'Kumite';                  // MVP: Kumite only
  akaName: string;                 // MVP: free-text athlete name
  aoName: string;
  akaAthleteId: string | null;     // Linked athlete ID, populated when registered
  aoAthleteId: string | null;
  tournamentId: string | null;
  categoryId: string | null;
  round: number;
  tatamiNo: number | null;
  settings: MatchSettings;
  startedAt: string | null;        // ISO 8601, set when timer first started
  endedAt: string | null;          // ISO 8601, set when match finalized
  createdAt: string;
  matchDraftSent: 0 | 1;           // 1 once the matches row has been upserted on the server
}

export interface LocalScoringEvent {
  id: string;                      // UUID, client-generated
  matchId: string;
  side: Side;
  kind: ScoringEventKind;
  technique: string | null;
  occurredAtMs: number;            // Elapsed ms from match startedAt
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Outbox: durable queue of pending sync operations.
// -----------------------------------------------------------------------------

export type OutboxKind = 'event' | 'match_finish';

export interface OutboxEntry {
  id: string;                      // UUID for the outbox row itself
  kind: OutboxKind;
  matchId: string;                 // For grouping
  eventId: string | null;          // For 'event' rows; null for 'match_finish'
  attempts: number;
  nextAttemptAt: number;           // Unix ms timestamp
  lastError: string | null;
  createdAt: string;
}

export class KarateScoringDB extends Dexie {
  matches!: EntityTable<LocalMatch, 'id'>;
  events!: EntityTable<LocalScoringEvent, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;

  constructor() {
    super('karate-scoring');

    this.version(1).stores({
      matches: 'id, status, createdAt',
      events: 'id, matchId, [matchId+occurredAtMs]',
    });

    this.version(2)
      .stores({
        matches: 'id, status, createdAt',
        events: 'id, matchId, [matchId+occurredAtMs]',
        outbox: 'id, kind, matchId, nextAttemptAt',
      })
      .upgrade(async (tx) => {
        // Existing matches predate the matchDraftSent field; default to 0 (not sent).
        await tx.table('matches').toCollection().modify((m: LocalMatch) => {
          if (m.matchDraftSent === undefined) m.matchDraftSent = 0;
        });
      });
  }
}

let cached: KarateScoringDB | null = null;
export function getDB(): KarateScoringDB {
  if (typeof window === 'undefined') {
    throw new Error('getDB() must only be called in the browser');
  }
  if (!cached) cached = new KarateScoringDB();
  return cached;
}
