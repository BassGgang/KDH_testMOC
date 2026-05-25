'use client';

import type { MatchSettings, ScoringEventKind, Side } from '@karate/domain';
import {
  getDB, type LocalMatch, type LocalScoringEvent, type OutboxEntry,
} from '../db/dexie';

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function enqueueEvent(matchId: string, eventId: string): OutboxEntry {
  return {
    id: uuid(),
    kind: 'event',
    matchId,
    eventId,
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
    createdAt: nowIso(),
  };
}

function enqueueMatchFinish(matchId: string): OutboxEntry {
  return {
    id: uuid(),
    kind: 'match_finish',
    matchId,
    eventId: null,
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
    createdAt: nowIso(),
  };
}

export interface CreateMatchInput {
  akaName: string;
  aoName: string;
  settings: MatchSettings;
  round?: number;
  tatamiNo?: number | null;
}

export interface ImportFromBracketInput {
  matchId: string;
  tournamentId: string;
  categoryId: string | null;
  akaName: string;
  aoName: string;
  akaAthleteId: string;
  aoAthleteId: string;
  round: number;
  settings?: MatchSettings;
}

/**
 * Import a match that was just started from a bracket on the server.
 * Creates a local match record with the server-assigned matchId so that the
 * scoring screen can find it and subsequent sync writes line up.
 *
 * matchDraftSent is set to 1 because the server already has the matches row.
 */
export async function importMatchFromBracket(input: ImportFromBracketInput): Promise<void> {
  const db = getDB();
  const existing = await db.matches.get(input.matchId);
  if (existing) return;

  const settings: MatchSettings = input.settings ?? {
    durationSec: 180,
    targetScore: 8,
    pointGap: 8,
    senshuEnabled: true,
  };

  const match: LocalMatch = {
    id: input.matchId,
    status: 'in_progress',
    type: 'Kumite',
    akaName: input.akaName,
    aoName: input.aoName,
    akaAthleteId: input.akaAthleteId,
    aoAthleteId: input.aoAthleteId,
    tournamentId: input.tournamentId,
    categoryId: input.categoryId,
    round: input.round,
    tatamiNo: null,
    settings,
    startedAt: null,
    endedAt: null,
    createdAt: nowIso(),
    matchDraftSent: 1,
  };
  await db.matches.add(match);
}

export async function createMatch(input: CreateMatchInput): Promise<string> {
  const db = getDB();
  const id = uuid();
  const match: LocalMatch = {
    id,
    status: 'in_progress',
    type: 'Kumite',
    akaName: input.akaName,
    aoName: input.aoName,
    akaAthleteId: null,
    aoAthleteId: null,
    tournamentId: null,
    categoryId: null,
    round: input.round ?? 1,
    tatamiNo: input.tatamiNo ?? null,
    settings: input.settings,
    startedAt: null,
    endedAt: null,
    createdAt: nowIso(),
    matchDraftSent: 0,
  };
  await db.matches.add(match);
  return id;
}

export async function startMatchTimer(matchId: string): Promise<void> {
  const db = getDB();
  const match = await db.matches.get(matchId);
  if (!match || match.startedAt) return;
  await db.matches.update(matchId, { startedAt: nowIso() });
}

export async function addEvent(
  matchId: string,
  side: Side,
  kind: ScoringEventKind,
  options: { technique?: string; occurredAtMs: number } = { occurredAtMs: 0 },
): Promise<void> {
  const db = getDB();
  const event: LocalScoringEvent = {
    id: uuid(),
    matchId,
    side,
    kind,
    technique: options.technique ?? null,
    occurredAtMs: options.occurredAtMs,
    createdAt: nowIso(),
  };
  // Atomic: insert event AND outbox entry in one transaction.
  await db.transaction('rw', db.events, db.outbox, async () => {
    await db.events.add(event);
    await db.outbox.add(enqueueEvent(matchId, event.id));
  });
}

export async function undoLastEvent(matchId: string): Promise<void> {
  const db = getDB();
  const last = await db.events
    .where('matchId').equals(matchId)
    .reverse()
    .sortBy('occurredAtMs')
    .then((events) => events[0]);
  if (!last) return;
  // Remove from events and from any pending outbox entry.
  await db.transaction('rw', db.events, db.outbox, async () => {
    await db.events.delete(last.id);
    await db.outbox.where({ kind: 'event', eventId: last.id }).delete();
  });
}

export async function finishMatch(matchId: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.matches, db.outbox, async () => {
    await db.matches.update(matchId, {
      status: 'finished',
      endedAt: nowIso(),
    });
    await db.outbox.add(enqueueMatchFinish(matchId));
  });
}

export async function resetMatch(matchId: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.events, db.outbox, db.matches, async () => {
    await db.events.where('matchId').equals(matchId).delete();
    await db.outbox.where('matchId').equals(matchId).delete();
    await db.matches.update(matchId, {
      status: 'in_progress',
      startedAt: null,
      endedAt: null,
      matchDraftSent: 0,
    });
  });
}

export async function deleteMatch(matchId: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.matches, db.events, db.outbox, async () => {
    await db.events.where('matchId').equals(matchId).delete();
    await db.outbox.where('matchId').equals(matchId).delete();
    await db.matches.delete(matchId);
  });
}
