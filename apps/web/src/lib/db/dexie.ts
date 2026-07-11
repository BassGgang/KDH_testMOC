import Dexie, { type EntityTable } from 'dexie';
import type { MatchSettings, PenaltyReason, Side, ScoringEventKind } from '@karate/domain';

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
  senshuHolder: Side | null;       // Manually assigned senshu (referee toggle)
  createdAt: string;
  matchDraftSent: 0 | 1;           // 1 once the matches row has been upserted on the server
}

export interface LocalScoringEvent {
  id: string;                      // UUID, client-generated
  matchId: string;
  side: Side;
  kind: ScoringEventKind;
  target: 'jodan' | 'chudan' | null;
  technique: 'tsuki' | 'keri' | null;
  penaltyReason: PenaltyReason | null;   // set when kind === 'c'
  occurredAtMs: number;            // Elapsed ms from match startedAt
  remainingMs: number;             // Remaining ms at the moment of the event
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

    // v3: unified `c` penalty model. Events gain target/penaltyReason/remainingMs.
    this.version(3)
      .stores({
        matches: 'id, status, createdAt',
        events: 'id, matchId, [matchId+occurredAtMs]',
        outbox: 'id, kind, matchId, nextAttemptAt',
      })
      .upgrade(async (tx) => {
        await tx.table('events').toCollection().modify((e: LocalScoringEvent) => {
          if (e.target === undefined) e.target = null;
          if (e.penaltyReason === undefined) e.penaltyReason = null;
          if (e.remainingMs === undefined) e.remainingMs = 0;
          // Legacy c1/c2 kinds collapse to the unified `c`.
          const legacyKind = e.kind as string;
          if (legacyKind === 'c1' || legacyKind === 'c2') {
            e.kind = 'c';
            if (!e.penaltyReason) e.penaltyReason = 'other';
          }
        });
        await tx.table('matches').toCollection().modify((m: LocalMatch) => {
          if (m.senshuHolder === undefined) m.senshuHolder = null;
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

/** Delete athlete names, match history and pending sync data from this device. */
export async function clearSensitiveLocalData(): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = getDB();
  await db.transaction('rw', db.matches, db.events, db.outbox, async () => {
    await Promise.all([db.matches.clear(), db.events.clear(), db.outbox.clear()]);
  });
}
