import React, { useState, useCallback, useMemo } from 'react';
import { Timer, AlertTriangle, Play, Pause, RotateCcw, Save, Trophy, Undo2, Redo2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScoreDetail, Athlete, MatchSettings } from '../types';

interface ScoringEvent {
  id: string;
  side: 'AKA' | 'AO';
  target: 'Jodan' | 'Chudan' | 'None';
  tech: 'Tsuki' | 'Keri' | 'None';
  pointType: 'Yuko' | 'Waza-ari' | 'Ippon' | 'C1' | 'C2';
  timestamp: number;
}

export default function ScoringInterface({ 
  athlete1, 
  athlete2, 
  settings,
  onComplete 
}: { 
  athlete1: Athlete | null; 
  athlete2: Athlete | null;
  settings: MatchSettings;
  onComplete: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(settings.duration); 
  const [isActive, setIsActive] = useState(false);
  const [isMatchOver, setIsMatchOver] = useState(false);
  
  // Scoring State
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [redoStack, setRedoStack] = useState<ScoringEvent[]>([]);
  
  // Sequential Entry State
  const [activeSide, setActiveSide] = useState<'AKA' | 'AO' | null>(null);
  const [activeTarget, setActiveTarget] = useState<'Jodan' | 'Chudan' | 'None'>('None');
  const [activeTech, setActiveTech] = useState<'Tsuki' | 'Keri' | 'None'>('None');

  const matchTime = settings.duration - timeLeft;

  const calculateScores = useMemo(() => {
    const res = {
      AKA: { ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0, total: 0 },
      AO: { ippon: 0, wazaAri: 0, yuko: 0, c1: 0, c2: 0, total: 0 }
    };

    events.forEach(e => {
      if (e.pointType === 'Ippon') {
        res[e.side].ippon++;
        res[e.side].total += 3;
      } else if (e.pointType === 'Waza-ari') {
        res[e.side].wazaAri++;
        res[e.side].total += 2;
      } else if (e.pointType === 'Yuko') {
        res[e.side].yuko++;
        res[e.side].total += 1;
      } else if (e.pointType === 'C1') {
        res[e.side].c1++;
      } else if (e.pointType === 'C2') {
        res[e.side].c2++;
      }
    });

    return res;
  }, [events]);

  // Check for Match End conditions
  React.useEffect(() => {
    if (isMatchOver) return;

    const akaTotal = calculateScores.AKA.total;
    const aoTotal = calculateScores.AO.total;
    const diff = Math.abs(akaTotal - aoTotal);

    // Condition 1: Target Score reached (e.g. 8 points)
    if (akaTotal >= settings.targetScore || aoTotal >= settings.targetScore) {
      setIsActive(false);
      setIsMatchOver(true);
    }
    // Condition 2: Point Difference reached (e.g. 8 points gap)
    else if (diff >= settings.pointGap) {
      setIsActive(false);
      setIsMatchOver(true);
    }
    // Condition 3: Time out
    else if (timeLeft === 0) {
      setIsActive(false);
      setIsMatchOver(true);
    }
  }, [calculateScores, settings, timeLeft, isMatchOver]);

  const commitEvent = useCallback((
    side: 'AKA' | 'AO',
    pointType: 'Yuko' | 'Waza-ari' | 'Ippon' | 'C1' | 'C2'
  ) => {
    const newEvent: ScoringEvent = {
      id: Math.random().toString(36).substr(2, 9),
      side,
      target: (pointType === 'C1' || pointType === 'C2') ? 'None' : activeTarget,
      tech: (pointType === 'C1' || pointType === 'C2') ? 'None' : activeTech,
      pointType,
      timestamp: matchTime
    };

    setEvents(prev => [...prev, newEvent]);
    setRedoStack([]);
    
    // Reset sequential flow
    setActiveSide(null);
    setActiveTarget('None');
    setActiveTech('None');
  }, [matchTime, activeTarget, activeTech]);

  const undo = () => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    setRedoStack(prev => [...prev, last]);
    setEvents(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setEvents(prev => [...prev, last]);
    setRedoStack(prev => prev.slice(0, -1));
  };

  if (!athlete1 || !athlete2) {
    return (
      <div className="h-full bg-gray-50 flex flex-col items-center justify-center p-8 text-center gap-6">
        <div className="w-16 h-16 border-2 border-navy-950 flex items-center justify-center rounded-2xl">
          <AlertTriangle size={32} className="text-navy-950" />
        </div>
        <p className="font-black text-navy-950/40 uppercase tracking-widest text-sm">先に「対戦相手」を選択してください</p>
      </div>
    );
  }

  React.useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 text-navy-950 min-h-full p-6 flex flex-col gap-6 overflow-hidden">
      {/* Header & Timer */}
      <div className="grid grid-cols-3 items-center border-b border-navy-950/10 pb-4 shrink-0">
        <h2 className="text-xl font-black tracking-tighter flex items-center gap-2 text-navy-950">
          <span className="w-1.5 h-6 bg-navy-950"></span>
          LIVE SCORING
        </h2>
        
        {/* Centered Timer & Large Control */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-5xl font-mono font-black tracking-[0.2em] text-navy-950 leading-none">
            {formatTime(timeLeft)}
          </div>
          {isMatchOver ? (
            <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-300">
               <span className="text-[10px] font-black text-red-600 tracking-[0.4em] uppercase">Match Ended</span>
               <div className="bg-red-600 text-white px-8 py-2 rounded-full text-xs font-black tracking-widest flex items-center gap-2">
                  <Trophy size={14} /> RESULT FINALIZED
               </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "flex items-center gap-3 px-10 py-3 rounded-full font-black tracking-widest transition-all shadow-xl active:scale-95 group",
                isActive 
                  ? "bg-navy-950 text-yellow-400 border-2 border-yellow-400" 
                  : "bg-yellow-400 text-navy-950 hover:bg-yellow-300 border-2 border-yellow-400"
              )}
            >
              {isActive ? (
                <>
                  <Pause size={24} fill="currentColor" strokeWidth={0} />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Play size={24} fill="currentColor" strokeWidth={0} />
                  <span>START</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex justify-end items-center gap-2">
          <button 
            onClick={undo}
            disabled={isActive || events.length === 0}
            className="p-3 border border-navy-950/10 hover:bg-navy-950/5 disabled:opacity-10 transition-colors rounded-xl text-navy-950 shadow-sm"
            title="Undo"
          >
            <Undo2 size={24} />
          </button>
          <button 
            onClick={redo}
            disabled={isActive || redoStack.length === 0}
            className="p-3 border border-navy-950/10 hover:bg-navy-950/5 disabled:opacity-10 transition-colors rounded-xl text-navy-950 shadow-sm"
            title="Redo"
          >
            <Redo2 size={24} />
          </button>
          <button 
            onClick={() => { setTimeLeft(settings.duration); setIsActive(false); setIsMatchOver(false); setEvents([]); setRedoStack([]); setActiveSide(null); setActiveTarget('None'); setActiveTech('None'); }}
            className="p-3 border border-navy-950/10 hover:bg-navy-950/5 transition-colors rounded-xl text-navy-950 shadow-sm"
            title="Reset"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* Main Scoring Grid */}
      <div className="flex-1 grid grid-cols-2 gap-12 overflow-hidden px-4">
        {/* AKA (Red) */}
        <ScoringPanel 
          side="AKA" 
          athleteName={athlete1.name} 
          score={calculateScores.AKA.total} 
          penalties={{ c1: calculateScores.AKA.c1, c2: calculateScores.AKA.c2 }}
          
          activeSide={activeSide}
          activeTarget={activeTarget}
          activeTech={activeTech}
          timerActive={isActive}
          isMatchOver={isMatchOver}

          onSideToggle={() => {
            if (activeSide === 'AKA') {
              setActiveSide(null);
              setActiveTarget('None');
              setActiveTech('None');
            } else {
              setActiveSide('AKA');
              setActiveTarget('None');
              setActiveTech('None');
            }
          }}
          onTargetSelect={setActiveTarget}
          onTechSelect={setActiveTech}
          onCommitPoint={(pt) => commitEvent('AKA', pt)}
          onCommitPenalty={(pt) => commitEvent('AKA', pt)}
          
          accentColor="bg-red-600 text-white"
        />

        {/* AO (Blue) */}
        <ScoringPanel 
          side="AO" 
          athleteName={athlete2.name} 
          score={calculateScores.AO.total} 
          penalties={{ c1: calculateScores.AO.c1, c2: calculateScores.AO.c2 }}
          
          activeSide={activeSide}
          activeTarget={activeTarget}
          activeTech={activeTech}
          timerActive={isActive}
          isMatchOver={isMatchOver}

          onSideToggle={() => {
            if (activeSide === 'AO') {
              setActiveSide(null);
              setActiveTarget('None');
              setActiveTech('None');
            } else {
              setActiveSide('AO');
              setActiveTarget('None');
              setActiveTech('None');
            }
          }}
          onTargetSelect={setActiveTarget}
          onTechSelect={setActiveTech}
          onCommitPoint={(pt) => commitEvent('AO', pt)}
          onCommitPenalty={(pt) => commitEvent('AO', pt)}
          
          accentColor="bg-blue-600 text-white"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center bg-white p-4 border border-navy-950/10 shrink-0 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-navy-950/5 flex items-center justify-center rounded-xl">
              <Trophy size={18} className="text-navy-950/40" />
           </div>
           <div>
              <p className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest">Match Progress</p>
              <p className="text-sm font-black tracking-tight text-navy-950">
                {calculateScores.AKA.total === calculateScores.AO.total ? "Draw" : 
                 calculateScores.AKA.total > calculateScores.AO.total ? "AKA Leading" : "AO Leading"}
              </p>
           </div>
        </div>
        {(isMatchOver || !isActive) && (
          <button 
            onClick={onComplete}
            className="bg-navy-950 text-white px-12 py-3 font-black tracking-[0.2em] hover:bg-navy-900 flex items-center gap-2 transition-all uppercase rounded-xl shadow-lg active:scale-95"
          >
            <Save size={18} />
            End Match & Analyze
          </button>
        )}
      </div>
    </div>
  );
}

function ScoringPanel({ 
  side, athleteName, score, penalties, 
  activeSide, activeTarget, activeTech, timerActive, isMatchOver,
  onSideToggle, onTargetSelect, onTechSelect, onCommitPoint, onCommitPenalty,
  accentColor 
}: { 
  side: 'AKA' | 'AO'; 
  athleteName: string; 
  score: number; 
  penalties: { c1: number, c2: number };
  
  activeSide: 'AKA' | 'AO' | null;
  activeTarget: 'Jodan' | 'Chudan' | 'None';
  activeTech: 'Tsuki' | 'Keri' | 'None';
  timerActive: boolean;
  isMatchOver: boolean;

  onSideToggle: () => void;
  onTargetSelect: (t: 'Jodan' | 'Chudan' | 'None') => void;
  onTechSelect: (t: 'Tsuki' | 'Keri' | 'None') => void;
  onCommitPoint: (pt: 'Yuko' | 'Waza-ari' | 'Ippon') => void;
  onCommitPenalty: (pt: 'C1' | 'C2') => void;

  accentColor: string;
}) {
  const isSelected = activeSide === side;
  const isOtherSelected = activeSide !== null && !isSelected;

  const canSelectTarget = isSelected && !timerActive;
  const canSelectTech = isSelected && activeTarget !== 'None' && !timerActive;
  const canSelectPoint = isSelected && activeTech !== 'None' && !timerActive;
  const canSelectSide = !timerActive && (!isOtherSelected);

  return (
    <div className="flex flex-col gap-4 overflow-hidden h-full text-navy-950">
      {/* Score Box (Display Only) */}
      <div className="flex flex-col shrink-0 shadow-lg rounded-3xl overflow-hidden bg-white border border-navy-950/5">
        <div className={cn("py-2 text-center text-[10px] font-black tracking-widest uppercase", accentColor)}>
          {side}: {athleteName}
        </div>
        <div className="py-8 flex items-center justify-center">
          <div className="text-[140px] font-mono font-black leading-none select-none text-navy-950">{score}</div>
        </div>
      </div>

      {/* Inputs (Flow Controlled) */}
      <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-navy-950/10 flex flex-col justify-center gap-4 relative shadow-xl">
        {timerActive && !isMatchOver && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 rounded-[2.5rem] flex flex-col items-center justify-center p-6 text-center gap-4 animate-in fade-in duration-200">
             <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl animate-pulse">
               <span className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_12px_#dc2626]"></span>
             </div>
             <div>
                <span className="text-white font-black text-xl tracking-tighter uppercase italic block mb-1">MATCH IN PROGRESS</span>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/50 block">Scoring is locked while fight is active</span>
             </div>
          </div>
        )}
        
        {isMatchOver && (
          <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm z-30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center gap-4">
             <Trophy size={48} className="text-yellow-400 animate-bounce" />
             <div>
                <p className="text-yellow-400 font-black text-2xl tracking-tighter uppercase italic">Victory Finalized</p>
                <p className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em]">Full match analysis ready below</p>
             </div>
          </div>
        )}

        {/* Row 1: Side Selector */}
        <div className="flex justify-center">
           <button 
             disabled={!canSelectSide}
             onClick={onSideToggle}
             className={cn(
               "px-16 py-6 rounded-3xl font-black text-4xl tracking-tighter transition-all active:scale-95 border-2",
               isSelected 
                 ? (side === 'AKA' ? "bg-red-600 border-red-500 text-white shadow-xl ring-2 ring-red-100" : "bg-blue-600 border-blue-500 text-white shadow-xl ring-2 ring-blue-100")
                 : (side === 'AKA' 
                    ? "bg-red-50 border-red-100 text-red-600 hover:bg-red-100" 
                    : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"),
               isOtherSelected && "opacity-20 grayscale-50 cursor-not-allowed"
             )}
           >
             {side === 'AKA' ? '赤' : '青'}
           </button>
        </div>

        {/* Row 2: Target */}
        <div className="grid grid-cols-2 gap-4">
          <ModifierButton 
            label="上段" sub="JODAN" 
            active={isSelected && activeTarget === 'Jodan'} 
            disabled={!canSelectTarget}
            onClick={() => onTargetSelect(activeTarget === 'Jodan' ? 'None' : 'Jodan')} 
          />
          <ModifierButton 
            label="中段" sub="CHUDAN" 
            active={isSelected && activeTarget === 'Chudan'} 
            disabled={!canSelectTarget}
            onClick={() => onTargetSelect(activeTarget === 'Chudan' ? 'None' : 'Chudan')} 
          />
        </div>

        {/* Row 3: Tech */}
        <div className="grid grid-cols-2 gap-4">
          <ModifierButton 
            label="突き" sub="TSUKI" 
            active={isSelected && activeTech === 'Tsuki'} 
            disabled={!canSelectTech}
            onClick={() => onTechSelect(activeTech === 'Tsuki' ? 'None' : 'Tsuki')} 
          />
          <ModifierButton 
            label="蹴り" sub="KERI" 
            active={isSelected && activeTech === 'Keri'} 
            disabled={!canSelectTech}
            onClick={() => onTechSelect(activeTech === 'Keri' ? 'None' : 'Keri')} 
          />
        </div>

        {/* Row 4: Score Trigger */}
        <div className="grid grid-cols-3 gap-3">
          <PointTrigger label="有効" sub="YUKO" disabled={!canSelectPoint} onClick={() => onCommitPoint('Yuko')} />
          <PointTrigger label="技あり" sub="WAZA-ARI" disabled={!canSelectPoint} onClick={() => onCommitPoint('Waza-ari')} />
          <PointTrigger label="一本" sub="IPPON" disabled={!canSelectPoint} onClick={() => onCommitPoint('Ippon')} />
        </div>

        {/* Row 5: Penalties */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-950/10">
           <PenaltyButton label="C1" count={penalties.c1} disabled={!isSelected || timerActive} onClick={() => onCommitPenalty('C1')} />
           <PenaltyButton label="C2" count={penalties.c2} disabled={!isSelected || timerActive} onClick={() => onCommitPenalty('C2')} />
        </div>
      </div>
    </div>
  );
}

function ModifierButton({ label, sub, active, disabled, onClick }: { label: string; sub: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "py-6 rounded-3xl transition-all active:scale-95 flex flex-col items-center justify-center gap-1 font-black shadow-md border-2",
        active 
          ? "bg-navy-950 text-white border-navy-950 shadow-lg ring-2 ring-navy-950/20" 
          : "bg-gray-100 border-gray-200 text-navy-950/40 hover:bg-white hover:border-navy-950/20 hover:text-navy-950 disabled:opacity-20 disabled:cursor-not-allowed"
      )}
    >
      <span className="text-2xl tracking-tighter">{label}</span>
      <span className="text-[8px] font-mono opacity-40 leading-none uppercase">{sub}</span>
    </button>
  );
}

function PointTrigger({ label, sub, disabled, onClick }: { label: string; sub: string; disabled: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "py-6 rounded-3xl transition-all active:scale-95 flex flex-col items-center justify-center gap-1 font-black border-2 shadow-md",
        !disabled 
          ? "bg-navy-950 text-white border-navy-950 hover:bg-navy-800" 
          : "bg-gray-50 border-gray-100 text-navy-950/5 cursor-not-allowed"
      )}
    >
      <span className="text-2xl tracking-tighter">{label}</span>
      <span className="text-[8px] font-mono opacity-40 leading-none uppercase">{sub}</span>
    </button>
  );
}

function PenaltyButton({ label, count, disabled, onClick }: { label: string; count: number; disabled: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl transition-all group shadow-sm",
        !disabled ? "hover:bg-white hover:border-yellow-500/30 cursor-pointer" : "opacity-20 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-2 text-left">
        <AlertTriangle size={16} className={cn("transition-colors", count > 0 ? "text-yellow-500" : "text-navy-950/10")} />
        <span className="font-black text-xs uppercase tracking-widest text-navy-950/40">{label}</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={cn(
            "w-2.5 h-2.5 rounded-full border transition-all",
            count >= i ? "bg-yellow-500 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]" : "bg-gray-200 border-gray-300"
          )} />
        ))}
      </div>
    </button>
  );
}
