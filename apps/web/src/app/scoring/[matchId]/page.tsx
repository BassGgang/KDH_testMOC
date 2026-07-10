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
  type PenaltyReason, type ScoringEvent, type ScoringEventKind, type Side,
} from '@karate/domain';
import { getDB } from '@/lib/db/dexie';
import {
  addEvent, finishMatch, resetMatch, setSenshuHolder, startMatchTimer, undoLastEvent,
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
      target: e.target ?? undefined,
      technique: e.technique ?? undefined,
      penaltyReason: e.penaltyReason ?? undefined,
      occurredAtMs: e.occurredAtMs,
      remainingMs: e.remainingMs,
    })),
    [events],
  );

  const outcome = useMemo(() => {
    if (!match) return null;
    return evaluateMatch({
      events: domainEvents,
      settings: match.settings,
      elapsedMs: elapsedSec * 1000,
      senshuHolder: match.senshuHolder,
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

  function remainingMs(): number {
    if (!match) return 0;
    return Math.max(0, (match.settings.durationSec - elapsedSec) * 1000);
  }

  async function handleAddPoint(side: Side, kind: 'ippon' | 'waza_ari' | 'yuko') {
    if (!match) return;
    if (!match.startedAt) await startMatchTimer(matchId);
    await addEvent(matchId, side, kind, {
      occurredAtMs: elapsedSec * 1000,
      remainingMs: remainingMs(),
    });
  }

  async function handleAddPenalty(side: Side, reason: PenaltyReason) {
    if (!match) return;
    if (!match.startedAt) await startMatchTimer(matchId);
    await addEvent(matchId, side, 'c', {
      penaltyReason: reason,
      occurredAtMs: elapsedSec * 1000,
      remainingMs: remainingMs(),
    });
  }

  async function handleToggleSenshu(side: Side) {
    if (!match) return;
    await setSenshuHolder(matchId, match.senshuHolder === side ? null : side);
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
          hasSenshu={match.senshuHolder === 'AKA'}
          senshuEnabled={match.settings.senshuEnabled}
          timerActive={isActive}
          isMatchOver={decided}
          isWinner={outcome?.status === 'decided' && outcome.winnerId === 'AKA'}
          isDraw={outcome?.status === 'hantei_required'}
          decisionReason={reasonLabel(outcome)}
          onPoint={(k) => handleAddPoint('AKA', k)}
          onPenalty={(r) => handleAddPenalty('AKA', r)}
          onToggleSenshu={() => handleToggleSenshu('AKA')}
        />
        <ScoringPanel
          side="AO"
          athleteName={match.aoName}
          score={totalPoints(scores.AO)}
          penaltyState={aoPenalty}
          hasSenshu={match.senshuHolder === 'AO'}
          senshuEnabled={match.settings.senshuEnabled}
          timerActive={isActive}
          isMatchOver={decided}
          isWinner={outcome?.status === 'decided' && outcome.winnerId === 'AO'}
          isDraw={outcome?.status === 'hantei_required'}
          decisionReason={reasonLabel(outcome)}
          onPoint={(k) => handleAddPoint('AO', k)}
          onPenalty={(r) => handleAddPenalty('AO', r)}
          onToggleSenshu={() => handleToggleSenshu('AO')}
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

const PENALTY_REASONS: { value: PenaltyReason; label: string }[] = [
  { value: 'atesugi', label: '当てすぎ' },
  { value: 'jogai', label: '場外' },
  { value: 'time_wasting', label: '時間の空費' },
  { value: 'mubobi', label: '無防備' },
  { value: 'grabbing', label: '相手のつかみすぎ' },
  { value: 'other', label: 'その他' },
  { value: 'ten_count', label: '10カウント (即失格)' },
];

function ScoringPanel({
  side, athleteName, score, penaltyState, hasSenshu, senshuEnabled,
  timerActive, isMatchOver, isWinner, isDraw, decisionReason,
  onPoint, onPenalty, onToggleSenshu,
}: {
  side: Side;
  athleteName: string;
  score: number;
  penaltyState: { count: number; isHansoku: boolean };
  hasSenshu: boolean;
  senshuEnabled: boolean;
  timerActive: boolean;
  isMatchOver: boolean;
  isWinner: boolean;
  isDraw: boolean;
  decisionReason: string;
  onPoint: (kind: 'ippon' | 'waza_ari' | 'yuko') => void;
  onPenalty: (reason: PenaltyReason) => void;
  onToggleSenshu: () => void;
}) {
  const [pickingReason, setPickingReason] = useState(false);
  const sideColor = side === 'AKA' ? 'bg-red-600' : 'bg-blue-600';
  const sideText = side === 'AKA' ? '赤' : '青';
  // Mock rule: scoring is locked while the clock is running; edit only when stopped.
  const disabled = timerActive || isMatchOver;

  return (
    <section className={cn(
      'bg-white rounded-3xl border-2 overflow-hidden shadow-sm relative',
      isWinner ? 'border-yellow-400 shadow-yellow-100' : 'border-navy-950/10',
    )}>
      <div className={cn('text-white text-center py-2 text-[10px] font-black tracking-widest uppercase', sideColor)}>
        {sideText} / {side} — {athleteName}
      </div>

      {/* Score + penalty dots + senshu indicator */}
      <div className="py-6 px-4 flex items-center justify-center gap-4">
        <PenaltyDots count={penaltyState.count} isHansoku={penaltyState.isHansoku} />
        <div className="text-[120px] font-mono font-black leading-none tabular-nums">{score}</div>
        <div className="flex flex-col items-center gap-1 w-12">
          <span className="text-[9px] font-black tracking-widest uppercase text-green-600">先取</span>
          <span className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black transition-all',
            hasSenshu ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.7)] scale-110'
                      : 'bg-navy-950/5 text-navy-950/20 border-2 border-navy-950/10',
          )}>
            SEN
          </span>
        </div>
      </div>

      {/* Point buttons */}
      <div className="grid grid-cols-3 gap-2 px-4">
        <PointButton label="有効" sub="YUKO +1"    disabled={disabled} onClick={() => onPoint('yuko')} />
        <PointButton label="技あり" sub="WAZA +2"  disabled={disabled} onClick={() => onPoint('waza_ari')} />
        <PointButton label="一本"   sub="IPPON +3" disabled={disabled} onClick={() => onPoint('ippon')} />
      </div>

      {/* Penalty + senshu */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <PenaltyButton
          count={penaltyState.count}
          isHansoku={penaltyState.isHansoku}
          disabled={disabled}
          onClick={() => setPickingReason(true)}
        />
        <SenshuButton
          active={hasSenshu}
          disabled={disabled || !senshuEnabled}
          onClick={onToggleSenshu}
        />
      </div>

      {/* Timer-active lock: input is blocked while the clock runs. */}
      {timerActive && !isMatchOver && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 text-center p-6 animate-in fade-in duration-200">
          <span className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_12px_#dc2626] animate-pulse" />
          <span className="text-white font-black text-lg tracking-tighter uppercase italic">Match In Progress</span>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/50">Scoring is locked while the fight is active</span>
        </div>
      )}

      {/* Match-over overlay: winner / hantei / plain end. */}
      {isMatchOver && (
        <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-center p-6 animate-in zoom-in duration-300">
          {isWinner ? (
            <>
              <Trophy size={44} className="text-yellow-400" />
              <p className="text-yellow-400 font-black text-2xl tracking-tighter uppercase italic">Winner / 勝者</p>
              <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">{decisionReason}</p>
            </>
          ) : isDraw ? (
            <>
              <AlertTriangle size={44} className="text-yellow-500" />
              <p className="text-yellow-500 font-black text-lg tracking-tighter uppercase italic">判定必要 / Hantei</p>
              <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">審判5人の投票による同点判定へ</p>
            </>
          ) : (
            <p className="text-white/40 font-black text-lg tracking-tighter uppercase italic">Match Over / 試合終了</p>
          )}
        </div>
      )}

      {pickingReason && (
        <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs flex flex-col gap-2 max-h-full overflow-y-auto">
            <p className="text-xs font-black uppercase tracking-widest text-navy-950/50 mb-1">反則の内容 / {sideText}</p>
            {PENALTY_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => { onPenalty(r.value); setPickingReason(false); }}
                className={cn(
                  'text-left px-3 py-2.5 rounded-xl border-2 font-bold text-sm active:scale-95 transition-all',
                  r.value === 'ten_count'
                    ? 'bg-red-50 border-red-200 text-red-700 hover:border-red-500'
                    : 'bg-gray-50 border-gray-100 text-navy-950 hover:border-navy-950/30',
                )}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setPickingReason(false)}
              className="mt-1 px-3 py-2 rounded-xl border border-navy-950/10 text-xs font-black uppercase tracking-widest text-navy-950/50 hover:bg-navy-950/5"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Vertical 5-dot penalty column beside the score, with the mock's amber glow.
function PenaltyDots({ count, isHansoku }: { count: number; isHansoku: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] font-black tracking-wider text-yellow-600">C</span>
      <div className="flex flex-col gap-1.5 p-1.5 bg-navy-950/5 rounded-xl">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn(
            'w-3 h-3 rounded-full border-2 transition-all',
            count >= i
              ? isHansoku
                ? 'bg-yellow-400 border-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.9)] scale-110 animate-pulse'
                : 'bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.7)]'
              : 'bg-white border-navy-950/10',
          )} />
        ))}
      </div>
    </div>
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

function PenaltyButton({ count, isHansoku, disabled, onClick }: { count: number; isHansoku: boolean; disabled: boolean; onClick: () => void }) {
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
        <span className="font-black text-xs uppercase tracking-widest">C 反則</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
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

function SenshuButton({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between p-3 rounded-2xl border-2 active:scale-95 transition-all',
        active   ? 'bg-green-600 text-white border-green-600' :
        disabled ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-30' :
                   'bg-white border-navy-950/20 hover:border-green-500',
      )}
    >
      <div className="flex items-center gap-2">
        <Trophy size={14} className={active ? 'text-white' : 'text-green-600'} />
        <span className="font-black text-xs uppercase tracking-widest">先取</span>
      </div>
      <span className="text-xs font-black">{active ? 'ON' : 'OFF'}</span>
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
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-navy-950/40">Result</p>
      <p className="font-black text-base tracking-tight">{winnerName} <span className="text-navy-950/40 text-xs ml-2">({reasonLabel(outcome)})</span></p>
    </div>
  );
}

const REASON_LABELS: Record<string, string> = {
  point_gap: 'ポイント差',
  target_score: '目標点到達',
  time_up: '時間切れ',
  hansoku: '反則勝ち',
  senshu: '先取',
  ippon_count: '一本数',
  wazaari_count: '技あり数',
  hantei: '判定',
};

function reasonLabel(outcome: ReturnType<typeof evaluateMatch> | null): string {
  if (!outcome || outcome.status !== 'decided') return '判定 / HANTEI';
  return REASON_LABELS[outcome.reason] ?? outcome.reason;
}

function CenteredText({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-navy-950/40 font-bold uppercase tracking-widest text-xs">
      {children}
    </main>
  );
}
