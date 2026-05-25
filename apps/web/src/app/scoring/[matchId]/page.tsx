'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle, ArrowLeft, Pause, Play, RotateCcw, Save, Trophy, Undo2,
} from 'lucide-react';
import {
  aggregateScores, evaluateMatch, evaluatePenalty, totalPoints,
  type ScoringEvent, type ScoringEventKind, type Side,
} from '@karate/domain';
import { getDB } from '@/lib/db/dexie';
import {
  addEvent, finishMatch, resetMatch, startMatchTimer, undoLastEvent,
} from '@/lib/scoring/actions';
import { cn, formatTime } from '@/lib/utils';
import { SyncStatus } from '@/components/SyncStatus';

export default function MatchScoringPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();

  const match = useLiveQuery(() => getDB().matches.get(matchId), [matchId]);
  const events = useLiveQuery(
    () => getDB().events.where('matchId').equals(matchId).sortBy('occurredAtMs'),
    [matchId],
  );

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Tick timer.
  useEffect(() => {
    if (!isActive || !match) return;
    if (elapsedSec >= match.settings.durationSec) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isActive, match, elapsedSec]);

  // Compute outcome with domain layer.
  const domainEvents: ScoringEvent[] = useMemo(
    () => (events ?? []).map((e) => ({
      id: e.id,
      matchId: e.matchId,
      side: e.side,
      kind: e.kind,
      technique: e.technique ?? undefined,
      occurredAtMs: e.occurredAtMs,
    })),
    [events],
  );

  const outcome = useMemo(() => {
    if (!match) return null;
    return evaluateMatch({
      events: domainEvents,
      settings: match.settings,
      elapsedMs: elapsedSec * 1000,
    });
  }, [match, domainEvents, elapsedSec]);

  // Auto-pause when match decided.
  useEffect(() => {
    if (outcome && outcome.status !== 'in_progress' && isActive) {
      setIsActive(false);
    }
  }, [outcome, isActive]);

  const scores = useMemo(() => aggregateScores(domainEvents), [domainEvents]);
  const akaPenalty = evaluatePenalty(scores.AKA);
  const aoPenalty = evaluatePenalty(scores.AO);

  async function handleAddEvent(side: Side, kind: ScoringEventKind) {
    if (!match) return;
    if (!match.startedAt) await startMatchTimer(matchId);
    await addEvent(matchId, side, kind, { occurredAtMs: elapsedSec * 1000 });
  }

  async function handleStartStop() {
    if (!match) return;
    if (!isActive && !match.startedAt) {
      await startMatchTimer(matchId);
    }
    setIsActive((a) => !a);
  }

  async function handleReset() {
    if (!confirm('採点記録をすべて消去します。よろしいですか?')) return;
    await resetMatch(matchId);
    setElapsedSec(0);
    setIsActive(false);
  }

  async function handleFinish() {
    await finishMatch(matchId);
    router.push('/scoring');
  }

  if (match === undefined || events === undefined) {
    return <CenteredText>Loading...</CenteredText>;
  }
  if (!match) {
    return <CenteredText>Match not found</CenteredText>;
  }

  const decided = outcome?.status === 'decided' || outcome?.status === 'hantei_required';

  return (
    <main className="min-h-screen bg-gray-50 text-navy-950 p-4 space-y-4">
      {/* Header */}
      <header className="bg-white p-4 rounded-2xl border border-navy-950/10 grid grid-cols-3 items-center gap-2 shadow-sm">
        <div>
          <Link href="/scoring" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 hover:text-navy-950 transition-colors">
            <ArrowLeft size={12} /> Back
          </Link>
          <h1 className="font-black tracking-tighter text-lg mt-1">
            R{match.round}
            {match.tatamiNo != null && ` / 第${match.tatamiNo}コート`}
          </h1>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            'text-4xl font-mono font-black tracking-[0.15em] leading-none',
            elapsedSec >= match.settings.durationSec ? 'text-accent-red' : 'text-navy-950',
          )}>
            {formatTime(Math.max(0, match.settings.durationSec - elapsedSec))}
          </div>
          {decided ? (
            <DecidedBadge outcome={outcome!} match={match} />
          ) : (
            <button
              onClick={handleStartStop}
              className={cn(
                'flex items-center gap-2 px-8 py-2 rounded-full font-black tracking-widest text-xs uppercase active:scale-95 transition-all',
                isActive ? 'bg-navy-950 text-yellow-400 border-2 border-yellow-400' : 'bg-yellow-400 text-navy-950 border-2 border-yellow-400 hover:bg-yellow-300',
              )}
            >
              {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isActive ? 'Stop' : 'Start'}
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 items-center">
          <SyncStatus />
          <IconButton title="Undo" disabled={domainEvents.length === 0} onClick={() => undoLastEvent(matchId)}>
            <Undo2 size={18} />
          </IconButton>
          <IconButton title="Reset" onClick={handleReset}>
            <RotateCcw size={18} />
          </IconButton>
        </div>
      </header>

      {/* Scoring Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoringPanel
          side="AKA"
          athleteName={match.akaName}
          score={totalPoints(scores.AKA)}
          penaltyState={akaPenalty}
          c1Count={scores.AKA.c1}
          c2Count={scores.AKA.c2}
          senshu={outcome?.status !== 'in_progress' ? null : (
            evaluateMatch({ events: domainEvents, settings: match.settings, elapsedMs: 0 }).status
          ) ? null : null}
          isWinner={outcome?.status === 'decided' && outcome.winnerId === 'AKA'}
          disabled={decided}
          onPoint={(k) => handleAddEvent('AKA', k)}
        />
        <ScoringPanel
          side="AO"
          athleteName={match.aoName}
          score={totalPoints(scores.AO)}
          penaltyState={aoPenalty}
          c1Count={scores.AO.c1}
          c2Count={scores.AO.c2}
          senshu={null}
          isWinner={outcome?.status === 'decided' && outcome.winnerId === 'AO'}
          disabled={decided}
          onPoint={(k) => handleAddEvent('AO', k)}
        />
      </div>

      {/* Footer */}
      <footer className="bg-white p-4 rounded-2xl border border-navy-950/10 flex items-center justify-between shadow-sm">
        <OutcomeSummary outcome={outcome} match={match} />
        {decided && (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 bg-navy-950 text-white px-6 py-3 font-black tracking-[0.2em] uppercase text-xs hover:bg-navy-900 active:scale-95 transition-all rounded-xl shadow-lg"
          >
            <Save size={16} />
            Finish & Save
          </button>
        )}
      </footer>
    </main>
  );
}

// ---------- Subcomponents ----------

function ScoringPanel({
  side, athleteName, score, c1Count, c2Count, penaltyState, isWinner, disabled, onPoint,
}: {
  side: Side;
  athleteName: string;
  score: number;
  c1Count: number;
  c2Count: number;
  penaltyState: { c1Status: string; c2Status: string; isHansoku: boolean };
  senshu: null;
  isWinner: boolean;
  disabled: boolean;
  onPoint: (kind: ScoringEventKind) => void;
}) {
  const sideColor = side === 'AKA' ? 'bg-red-600' : 'bg-blue-600';
  const sideText = side === 'AKA' ? '赤' : '青';

  return (
    <section className={cn(
      'bg-white rounded-3xl border-2 overflow-hidden shadow-sm relative',
      isWinner ? 'border-yellow-400 shadow-yellow-100' : 'border-navy-950/10',
    )}>
      <div className={cn('text-white text-center py-2 text-[10px] font-black tracking-widest uppercase', sideColor)}>
        {sideText} / {side} — {athleteName}
      </div>

      <div className="py-6 flex items-center justify-center">
        <div className="text-[120px] font-mono font-black leading-none">{score}</div>
      </div>

      {/* Point buttons */}
      <div className="grid grid-cols-3 gap-2 px-4">
        <PointButton label="有効" sub="YUKO +1"     disabled={disabled} onClick={() => onPoint('yuko')} />
        <PointButton label="技あり" sub="WAZA +2"   disabled={disabled} onClick={() => onPoint('waza_ari')} />
        <PointButton label="一本"   sub="IPPON +3" disabled={disabled} onClick={() => onPoint('ippon')} />
      </div>

      {/* Penalty buttons */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <PenaltyButton label="C1" count={c1Count} status={penaltyState.c1Status} disabled={disabled} onClick={() => onPoint('c1')} />
        <PenaltyButton label="C2" count={c2Count} status={penaltyState.c2Status} disabled={disabled} onClick={() => onPoint('c2')} />
      </div>

      {/* Termination buttons */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <TerminationButton label="Hansoku" disabled={disabled} onClick={() => onPoint('hansoku')} />
        <TerminationButton label="Kiken"   disabled={disabled} onClick={() => onPoint('kiken')} />
        <TerminationButton label="Shikkaku" disabled={disabled} onClick={() => onPoint('shikkaku')} />
      </div>

      {isWinner && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-navy-950 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 shadow-lg">
          <Trophy size={12} fill="currentColor" />
          Winner
        </div>
      )}
    </section>
  );
}

function PointButton({ label, sub, disabled, onClick }: { label: string; sub: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'py-4 rounded-2xl font-black border-2 active:scale-95 transition-all flex flex-col items-center justify-center gap-1',
        disabled ? 'bg-gray-50 border-gray-100 text-navy-950/10 cursor-not-allowed'
                 : 'bg-navy-950 text-white border-navy-950 hover:bg-navy-900',
      )}
    >
      <span className="text-lg tracking-tighter">{label}</span>
      <span className="text-[9px] font-mono opacity-50 uppercase">{sub}</span>
    </button>
  );
}

function PenaltyButton({ label, count, status, disabled, onClick }: { label: string; count: number; status: string; disabled: boolean; onClick: () => void }) {
  const isHansoku = status === 'hansoku';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between p-3 rounded-2xl border-2 active:scale-95 transition-all',
        isHansoku ? 'bg-accent-red text-white border-accent-red' :
        disabled  ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-30' :
                    'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className={isHansoku ? 'text-white' : 'text-yellow-600'} />
        <span className="font-black text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={cn(
            'w-2.5 h-2.5 rounded-full border transition-all',
            count >= i
              ? isHansoku ? 'bg-white border-white' : 'bg-yellow-500 border-yellow-400'
              : 'bg-gray-200 border-gray-300',
          )} />
        ))}
      </div>
    </button>
  );
}

function TerminationButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'py-2 rounded-xl font-black border-2 text-[10px] tracking-widest uppercase active:scale-95 transition-all',
        disabled ? 'bg-gray-50 border-gray-100 text-navy-950/10 cursor-not-allowed'
                 : 'bg-white border-accent-red text-accent-red hover:bg-accent-red hover:text-white',
      )}
    >
      {label}
    </button>
  );
}

function IconButton({ children, title, disabled, onClick }: { children: React.ReactNode; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="p-3 border border-navy-950/10 hover:bg-navy-950/5 disabled:opacity-20 transition-colors rounded-xl text-navy-950 shadow-sm"
    >
      {children}
    </button>
  );
}

function DecidedBadge({ outcome, match }: { outcome: NonNullable<ReturnType<typeof evaluateMatch>>; match: { akaName: string; aoName: string } }) {
  if (outcome.status === 'hantei_required') {
    return (
      <div className="flex items-center gap-2 bg-yellow-400 text-navy-950 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-md">
        <AlertTriangle size={14} /> Hantei Required
      </div>
    );
  }
  if (outcome.status === 'decided') {
    const winnerName = outcome.winnerId === 'AKA' ? match.akaName : outcome.winnerId === 'AO' ? match.aoName : 'Draw';
    return (
      <div className="flex items-center gap-2 bg-navy-950 text-yellow-400 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-md">
        <Trophy size={14} fill="currentColor" /> {winnerName}
      </div>
    );
  }
  return null;
}

function OutcomeSummary({ outcome, match }: { outcome: ReturnType<typeof evaluateMatch> | null; match: { akaName: string; aoName: string } }) {
  if (!outcome) return null;
  if (outcome.status === 'in_progress') {
    return <p className="text-[10px] font-black uppercase tracking-widest text-navy-950/40">In Progress</p>;
  }
  if (outcome.status === 'hantei_required') {
    return <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700">Hantei (判定) Required — 主審判定を待つ</p>;
  }
  const winnerName = outcome.winnerId === 'AKA' ? match.akaName : outcome.winnerId === 'AO' ? match.aoName : 'Draw';
  const reasonMap: Record<string, string> = {
    point_gap: 'ポイント差',
    target_score: '目標点到達',
    time_up: '時間切れ',
    hansoku: '反則勝ち',
    kiken: '棄権',
    shikkaku: '失格',
    hantei: '判定',
  };
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-navy-950/40">Result</p>
      <p className="font-black text-base tracking-tight">{winnerName} <span className="text-navy-950/40 text-xs ml-2">({reasonMap[outcome.reason] ?? outcome.reason})</span></p>
    </div>
  );
}

function CenteredText({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-navy-950/40 font-bold uppercase tracking-widest text-xs">
      {children}
    </main>
  );
}
