'use client';

import type {
  MatchDraft, SyncEventsRequest, SyncEventsResponse,
  SyncMatchFinishRequest, SyncMatchFinishResponse,
} from '@karate/schemas';
import {
  aggregateScores, evaluateMatch, totalPoints, type ScoringEvent,
} from '@karate/domain';
import {
  getDB, type LocalMatch, type LocalScoringEvent, type OutboxEntry,
} from '../db/dexie';

// Backoff: 1s, 5s, 30s, 1m, 5m, 30m, then capped.
const BACKOFF_MS = [1_000, 5_000, 30_000, 60_000, 300_000, 1_800_000];
function nextBackoff(attempts: number): number {
  const idx = Math.min(attempts, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx]!;
}

let running = false;

export async function runSyncOnce(): Promise<{ processed: number; failed: number }> {
  if (running) return { processed: 0, failed: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, failed: 0 };
  }

  running = true;
  let processed = 0;
  let failed = 0;
  try {
    const db = getDB();
    const now = Date.now();
    const due = await db.outbox.where('nextAttemptAt').belowOrEqual(now).toArray();

    // Group by matchId so we can batch event syncs per match.
    const byMatch = new Map<string, OutboxEntry[]>();
    for (const entry of due) {
      const list = byMatch.get(entry.matchId) ?? [];
      list.push(entry);
      byMatch.set(entry.matchId, list);
    }

    for (const [matchId, entries] of byMatch) {
      const eventEntries = entries.filter((e) => e.kind === 'event');
      const finishEntry = entries.find((e) => e.kind === 'match_finish');

      // 1. Drain pending events first.
      if (eventEntries.length > 0) {
        const result = await syncEvents(matchId, eventEntries);
        processed += result.processed;
        failed += result.failed;
      }

      // 2. Then send the finish marker, if any.
      if (finishEntry) {
        const result = await syncFinish(matchId, finishEntry);
        processed += result.processed;
        failed += result.failed;
      }
    }
  } finally {
    running = false;
  }
  return { processed, failed };
}

// --- helpers ---

async function syncEvents(
  matchId: string,
  entries: OutboxEntry[],
): Promise<{ processed: number; failed: number }> {
  const db = getDB();
  const match = await db.matches.get(matchId);
  if (!match) {
    // Match was deleted locally; discard outbox entries.
    await db.outbox.bulkDelete(entries.map((e) => e.id));
    return { processed: entries.length, failed: 0 };
  }

  const eventIds = entries.map((e) => e.eventId).filter((id): id is string => id != null);
  const events = await db.events.bulkGet(eventIds);
  const payloadEvents = events.filter((e): e is LocalScoringEvent => e != null).map((e) => ({
    id: e.id,
    matchId: e.matchId,
    side: e.side,
    kind: e.kind,
    target: e.target ?? undefined,
    technique: e.technique ?? undefined,
    penaltyReason: e.penaltyReason ?? undefined,
    occurredAtMs: e.occurredAtMs,
    remainingMs: e.remainingMs,
  }));

  if (payloadEvents.length === 0) {
    await db.outbox.bulkDelete(entries.map((e) => e.id));
    return { processed: entries.length, failed: 0 };
  }

  const body: SyncEventsRequest = {
    matchId,
    events: payloadEvents,
    ...(match.matchDraftSent === 0 ? { match: toMatchDraft(match) } : {}),
  };

  try {
    const res = await fetch('/api/sync/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    await res.json() as SyncEventsResponse;
    await db.transaction('rw', db.outbox, db.matches, async () => {
      await db.outbox.bulkDelete(entries.map((e) => e.id));
      if (match.matchDraftSent === 0) {
        await db.matches.update(matchId, { matchDraftSent: 1 });
      }
    });
    return { processed: entries.length, failed: 0 };
  } catch (err) {
    await scheduleRetry(entries, err);
    return { processed: 0, failed: entries.length };
  }
}

async function syncFinish(
  matchId: string,
  entry: OutboxEntry,
): Promise<{ processed: number; failed: number }> {
  const db = getDB();
  const match = await db.matches.get(matchId);
  if (!match) {
    await db.outbox.delete(entry.id);
    return { processed: 1, failed: 0 };
  }
  if (match.status !== 'finished' && match.status !== 'synced') {
    // Finish was queued but match was reset. Discard.
    await db.outbox.delete(entry.id);
    return { processed: 1, failed: 0 };
  }

  const localEvents = await db.events.where('matchId').equals(matchId).sortBy('occurredAtMs');
  const domainEvents: ScoringEvent[] = localEvents.map((e) => ({
    id: e.id,
    matchId: e.matchId,
    side: e.side,
    kind: e.kind,
    target: e.target ?? undefined,
    technique: e.technique ?? undefined,
    penaltyReason: e.penaltyReason ?? undefined,
    occurredAtMs: e.occurredAtMs,
    remainingMs: e.remainingMs,
  }));

  const elapsedMs = match.settings.durationSec * 1000;
  const outcome = evaluateMatch({
    events: domainEvents,
    settings: match.settings,
    elapsedMs,
    senshuHolder: match.senshuHolder,
  });

  const winnerSide = outcome.status === 'decided' ? outcome.winnerId : null;
  const winnerAthleteId =
    winnerSide === 'AKA' ? match.akaAthleteId :
    winnerSide === 'AO'  ? match.aoAthleteId  : null;
  const senshuHolder = outcome.status !== 'in_progress'
    ? (outcome.senshuHolder ?? null) : null;
  const reason =
    outcome.status === 'decided' ? outcome.reason :
    outcome.status === 'hantei_required' ? 'hantei' : 'time_up';

  const body: SyncMatchFinishRequest = {
    matchId,
    tournamentId: match.tournamentId,
    categoryId: match.categoryId,
    type: 'Kumite',
    round: match.round,
    tatamiNo: match.tatamiNo,
    startedAt: match.startedAt ?? match.createdAt,
    endedAt: match.endedAt ?? new Date().toISOString(),
    aka: { athleteId: match.akaAthleteId },
    ao: { athleteId: match.aoAthleteId },
    settings: match.settings,
    events: domainEvents.map((e) => ({
      id: e.id,
      matchId: e.matchId,
      side: e.side,
      kind: e.kind,
      target: e.target,
      technique: e.technique,
      penaltyReason: e.penaltyReason,
      occurredAtMs: e.occurredAtMs,
      remainingMs: e.remainingMs,
    })),
    result: {
      winnerId: winnerAthleteId,
      reason,
      senshuHolder,
    },
  };

  try {
    const res = await fetch('/api/sync/match/finish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    await res.json() as SyncMatchFinishResponse;
    await db.transaction('rw', db.outbox, db.matches, async () => {
      await db.outbox.delete(entry.id);
      await db.matches.update(matchId, { status: 'synced' });
    });
    return { processed: 1, failed: 0 };
  } catch (err) {
    await scheduleRetry([entry], err);
    return { processed: 0, failed: 1 };
  }
}

async function scheduleRetry(entries: OutboxEntry[], err: unknown): Promise<void> {
  const db = getDB();
  const message = err instanceof Error ? err.message : String(err);
  const now = Date.now();
  await db.transaction('rw', db.outbox, async () => {
    for (const entry of entries) {
      const attempts = entry.attempts + 1;
      await db.outbox.update(entry.id, {
        attempts,
        nextAttemptAt: now + nextBackoff(attempts),
        lastError: message,
      });
    }
  });
}

function toMatchDraft(match: LocalMatch): MatchDraft {
  return {
    type: 'Kumite',
    round: match.round,
    tatamiNo: match.tatamiNo,
    tournamentId: match.tournamentId,
    categoryId: match.categoryId,
    akaAthleteId: match.akaAthleteId,
    aoAthleteId: match.aoAthleteId,
    settings: match.settings,
    startedAt: match.startedAt,
  };
}

// --- public lifecycle helpers ---

export function startSyncLoop(intervalMs = 5000): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let timer: ReturnType<typeof setInterval> | null = null;
  const tick = () => { void runSyncOnce(); };

  timer = setInterval(tick, intervalMs);
  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', tick);
  tick();

  return () => {
    if (timer) clearInterval(timer);
    window.removeEventListener('online', tick);
    document.removeEventListener('visibilitychange', tick);
  };
}
