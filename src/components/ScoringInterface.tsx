import React, { useState, useCallback, useMemo } from 'react';
import { Timer, AlertTriangle, Play, Pause, RotateCcw, Save, Trophy, Undo2, Redo2, Lock, Trash2, X, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScoreDetail, Athlete, MatchSettings } from '../types';

interface ScoringEvent {
  id: string;
  side: 'AKA' | 'AO';
  target: 'Jodan' | 'Chudan' | 'None';
  tech: 'Tsuki' | 'Keri' | 'None';
  pointType: 'Yuko' | 'Waza-ari' | 'Ippon' | 'C';
  timestamp: number;
  remainingTime?: number;
  penaltyReason?: string;
}

interface DecisionDetail {
  winner: 'AKA' | 'AO' | 'None';
  reason: string;
  step?: 1 | 2 | 3;
}

function determineWinner(
  scores: {
    AKA: { ippon: number; wazaAri: number; yuko: number; c: number; total: number };
    AO: { ippon: number; wazaAri: number; yuko: number; c: number; total: number };
  },
  senshuOwner: 'AKA' | 'AO' | null,
  isMatchOver: boolean
): DecisionDetail {
  // Check for disqualification (5 penalties)
  const akaDisqualified = scores.AKA.c >= 5;
  const aoDisqualified = scores.AO.c >= 5;

  if (akaDisqualified && aoDisqualified) {
    return { winner: 'None', reason: '両者反則失格 (Both Disqualified by Hansoku)' };
  }
  if (akaDisqualified) {
    return { winner: 'AO', reason: '赤の反則失格による青の勝ち (Blue wins by Red Hansoku)' };
  }
  if (aoDisqualified) {
    return { winner: 'AKA', reason: '青の反則失格による赤の勝ち (Red wins by Blue Hansoku)' };
  }

  const akaTotal = scores.AKA.total;
  const aoTotal = scores.AO.total;

  if (akaTotal > aoTotal) {
    return { winner: 'AKA', reason: '高い得点 (Highest Score)' };
  }
  if (aoTotal > akaTotal) {
    return { winner: 'AO', reason: '高い得点 (Highest Score)' };
  }

  // Scores are equal. Let's look at Senshu if it's active
  if (senshuOwner === 'AKA') {
    return { winner: 'AKA', reason: '「先取（センシュ）」獲得 (Senshu Advantage)' };
  }
  if (senshuOwner === 'AO') {
    return { winner: 'AO', reason: '「先取（センシュ）」獲得 (Senshu Advantage)' };
  }

  // Scores are equal and no one has Senshu
  // Step 1: Count of Ippon
  if (scores.AKA.ippon > scores.AO.ippon) {
    return { winner: 'AKA', reason: '同点判定ステップ1: 一本獲得数が多い (More Ippons)', step: 1 };
  }
  if (scores.AO.ippon > scores.AKA.ippon) {
    return { winner: 'AO', reason: '同点判定ステップ1: 一本獲得数が多い (More Ippons)', step: 1 };
  }

  // Step 2: Count of Waza-ari
  if (scores.AKA.wazaAri > scores.AO.wazaAri) {
    return { winner: 'AKA', reason: '同点判定ステップ2: 技有り獲得数が多い (More Waza-aris)', step: 2 };
  }
  if (scores.AO.wazaAri > scores.AKA.wazaAri) {
    return { winner: 'AO', reason: '同点判定ステップ2: 技有り獲得数が多い (More Waza-aris)', step: 2 };
  }

  // Step 3: Referee Decision (Hantei)
  return { winner: 'None', reason: '同点判定ステップ3: 審判5人による判定投票が必要 (Requires Hantei)', step: 3 };
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
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [senshuOwner, setSenshuOwner] = useState<'AKA' | 'AO' | null>(null);
  const [cPenaltyPrompt, setCPenaltyPrompt] = useState<{ side: 'AKA' | 'AO' } | null>(null);
  
  // Sequential Entry State
  const [activeSide, setActiveSide] = useState<'AKA' | 'AO' | null>(null);
  const [activeTarget, setActiveTarget] = useState<'Jodan' | 'Chudan' | 'None'>('None');
  const [activeTech, setActiveTech] = useState<'Tsuki' | 'Keri' | 'None'>('None');

  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdminVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === '1234' || passwordInput.toLowerCase() === 'admin') {
      setIsAdminAuthenticated(true);
      setShowPasswordModal(false);
      setIsAdminOpen(true);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('パスワードが正しくありません / Incorrect Password');
    }
  };

  const matchTime = settings.duration - timeLeft;

  const calculateScores = useMemo(() => {
    const res = {
      AKA: { ippon: 0, wazaAri: 0, yuko: 0, c: 0, total: 0 },
      AO: { ippon: 0, wazaAri: 0, yuko: 0, c: 0, total: 0 }
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
      } else if (e.pointType === 'C') {
        if (e.penaltyReason === '10カウント') {
          res[e.side].c += 5;
        } else {
          res[e.side].c++;
          
          // ラスト15秒（残り時間15秒以下）の場合のポイント加算
          const remTime = e.remainingTime !== undefined ? e.remainingTime : (settings.duration - e.timestamp);
          const isLast15Seconds = remTime <= 15;
          const isAtteSugi = e.penaltyReason === '当てすぎ';
          
          if (isLast15Seconds) {
            const oppositeSide = e.side === 'AKA' ? 'AO' : 'AKA';
            if (isAtteSugi) {
              res[oppositeSide].total += 1;
            } else {
              res[oppositeSide].total += 4;
            }
          }
        }
      }
    });

    return res;
  }, [events, settings.duration]);

  const senshuDetail = useMemo(() => {
    if (!settings.senshuEnabled) {
      return { owner: null as 'AKA' | 'AO' | null, reason: '設定で無効' };
    }
    return {
      owner: senshuOwner,
      reason: senshuOwner ? `${senshuOwner === 'AKA' ? '赤（AKA）' : '青（AO）'}が先取保持` : '先取なし'
    };
  }, [senshuOwner, settings.senshuEnabled]);

  const decision = useMemo(() => {
    return determineWinner(calculateScores, senshuDetail.owner, isMatchOver);
  }, [calculateScores, senshuDetail.owner, isMatchOver]);

  // Check for Match End conditions
  React.useEffect(() => {
    const akaTotal = calculateScores.AKA.total;
    const aoTotal = calculateScores.AO.total;
    const diff = Math.abs(akaTotal - aoTotal);

    // If game has ended because of score/disqualification but conditions are no longer met (due to deletion in admin panel):
    if (isMatchOver) {
      if (timeLeft > 0 && 
          akaTotal < settings.targetScore && 
          aoTotal < settings.targetScore && 
          diff < settings.pointGap &&
          calculateScores.AKA.c < 5 &&
          calculateScores.AO.c < 5) {
        setIsMatchOver(false);
      }
      return;
    }

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
    // Condition 4: Disqualification (5 warnings of C)
    else if (calculateScores.AKA.c >= 5 || calculateScores.AO.c >= 5) {
      setIsActive(false);
      setIsMatchOver(true);
    }
  }, [calculateScores, settings, timeLeft, isMatchOver]);

  const commitEvent = useCallback((
    side: 'AKA' | 'AO',
    pointType: 'Yuko' | 'Waza-ari' | 'Ippon' | 'C',
    penaltyReason?: string
  ) => {
    const newEvent: ScoringEvent = {
      id: Math.random().toString(36).substr(2, 9),
      side,
      target: (pointType === 'C') ? 'None' : activeTarget,
      tech: (pointType === 'C') ? 'None' : activeTech,
      pointType,
      timestamp: matchTime,
      remainingTime: timeLeft,
      penaltyReason
    };

    setEvents(prev => [...prev, newEvent]);
    setRedoStack([]);
    setCanUndo(true);
    
    // Reset sequential flow
    setActiveSide(null);
    setActiveTarget('None');
    setActiveTech('None');
  }, [matchTime, timeLeft, activeTarget, activeTech]);

  const undo = () => {
    if (events.length === 0 || !canUndo) return;
    const last = events[events.length - 1];
    setRedoStack(prev => [...prev, last]);
    setEvents(prev => prev.slice(0, -1));
    setCanUndo(false);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setEvents(prev => [...prev, last]);
    setRedoStack(prev => prev.slice(0, -1));
    setCanUndo(true);
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
        setTimeLeft(t => {
          const next = t - 0.01;
          if (next <= 0) {
            setIsActive(false);
            return 0;
          }
          return parseFloat(next.toFixed(2));
        });
      }, 10);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    if (seconds <= 15) {
      return seconds.toFixed(2);
    }
    const totalSecs = Math.ceil(seconds);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getPenaltyDotsToFlash = useCallback((side: 'AKA' | 'AO') => {
    const last15sPenalties = events.filter(e => 
      e.side === side && 
      e.pointType === 'C' && 
      e.penaltyReason !== '10カウント' &&
      (e.remainingTime !== undefined ? e.remainingTime : (settings.duration - e.timestamp)) <= 15
    );
    if (last15sPenalties.length === 0) return 0;
    
    const latest = last15sPenalties[last15sPenalties.length - 1];
    return latest.penaltyReason === '当てすぎ' ? 1 : 4;
  }, [events, settings.duration]);

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
          <div className={cn(
            "text-5xl font-mono font-black tracking-[0.2em] leading-none transition-all duration-200",
            timeLeft <= 15 
              ? "text-red-600 drop-shadow-[0_0_12px_rgba(220,38,38,0.6)] animate-pulse scale-110" 
              : "text-navy-950"
          )}>
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
            disabled={isActive || events.length === 0 || !canUndo}
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
            onClick={() => { setTimeLeft(settings.duration); setIsActive(false); setIsMatchOver(false); setEvents([]); setRedoStack([]); setCanUndo(false); setActiveSide(null); setActiveTarget('None'); setActiveTech('None'); }}
            className="p-3 border border-navy-950/10 hover:bg-navy-950/5 transition-colors rounded-xl text-navy-950 shadow-sm"
            title="Reset"
          >
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={() => {
              if (isAdminAuthenticated) {
                setIsAdminOpen(true);
              } else {
                setShowPasswordModal(true);
              }
            }}
            className="p-3 border border-navy-950/10 hover:bg-navy-950/5 hover:border-yellow-500 hover:text-yellow-600 transition-colors rounded-xl text-navy-950 shadow-sm flex items-center gap-1.5 font-black text-xs shrink-0 cursor-pointer"
            title="管理者画面 / Admin Dashboard"
          >
            <Lock size={18} />
            <span>管理者 / Admin</span>
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
          penalties={{ c: calculateScores.AKA.c }}
          last15sPenaltyDotsToFlash={getPenaltyDotsToFlash('AKA')}
          
          activeSide={activeSide}
          activeTarget={activeTarget}
          activeTech={activeTech}
          timerActive={isActive}
          isMatchOver={isMatchOver}
          hasSenshu={senshuOwner === 'AKA'}
          isWinner={isMatchOver && decision.winner === 'AKA'}
          isDraw={isMatchOver && decision.winner === 'None'}
          decisionReason={decision.reason}

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
          onCommitPenalty={() => {
            setCPenaltyPrompt({ side: 'AKA' });
          }}
          onSenshuToggle={() => {
            setSenshuOwner(prev => prev === 'AKA' ? null : 'AKA');
            setActiveSide(null);
            setActiveTarget('None');
            setActiveTech('None');
          }}
          
          accentColor="bg-red-600 text-white"
        />

        {/* AO (Blue) */}
        <ScoringPanel 
          side="AO" 
          athleteName={athlete2.name} 
          score={calculateScores.AO.total} 
          penalties={{ c: calculateScores.AO.c }}
          last15sPenaltyDotsToFlash={getPenaltyDotsToFlash('AO')}
          
          activeSide={activeSide}
          activeTarget={activeTarget}
          activeTech={activeTech}
          timerActive={isActive}
          isMatchOver={isMatchOver}
          hasSenshu={senshuOwner === 'AO'}
          isWinner={isMatchOver && decision.winner === 'AO'}
          isDraw={isMatchOver && decision.winner === 'None'}
          decisionReason={decision.reason}

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
          onCommitPenalty={() => {
            setCPenaltyPrompt({ side: 'AO' });
          }}
          onSenshuToggle={() => {
            setSenshuOwner(prev => prev === 'AO' ? null : 'AO');
            setActiveSide(null);
            setActiveTarget('None');
            setActiveTech('None');
          }}
          
          accentColor="bg-blue-600 text-white"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center bg-white p-4 border border-navy-950/10 shrink-0 rounded-2xl shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-10 h-10 bg-navy-950/5 flex items-center justify-center rounded-xl">
              <Trophy size={18} className="text-navy-950" />
           </div>
           <div className="flex gap-8">
              <div>
                 <p className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest leading-normal">先取状況 / SENSHU STATUS</p>
                 <p className="text-xs font-black tracking-tight text-navy-950 flex items-center gap-1.5 mt-0.5">
                   {senshuDetail.owner ? (
                     <>
                       <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                       <span>{senshuDetail.owner === 'AKA' ? '赤（AKA）先取保持' : '青（AO）先取保持'}</span>
                     </>
                   ) : (
                     <>
                       <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                       <span className="text-navy-950/40 font-semibold">{senshuDetail.reason}</span>
                     </>
                   )}
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest leading-normal">勝敗判定 / MATCH DECISION</p>
                 <p className="text-xs font-black tracking-tight text-navy-950 mt-0.5">
                   {isMatchOver ? (
                     <span className={cn(decision.winner === 'None' ? "text-yellow-600" : "text-green-600", "font-extrabold")}>
                       勝者: {decision.winner === 'AKA' ? `赤 (${athlete1.name})` : decision.winner === 'AO' ? `青 (${athlete2.name})` : '判定（HANTEI）投票へ'} ({decision.reason})
                     </span>
                   ) : (
                     <span>
                       現在リード: {decision.winner === 'AKA' ? '赤' : decision.winner === 'AO' ? '青' : '同点'} ({decision.reason})
                     </span>
                   )}
                 </p>
              </div>
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

      {cPenaltyPrompt && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-navy-950 text-navy-950 max-w-sm w-full rounded-[2rem] overflow-hidden shadow-2xl flex flex-col p-8 gap-6 animate-in zoom-in duration-300">
            <div className="text-center">
              <span className={cn(
                "inline-block px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-2",
                cPenaltyPrompt.side === 'AKA' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
              )}>
                {cPenaltyPrompt.side === 'AKA' ? '赤 / AKA' : '青 / AO'}のC反則警告
              </span>
              <h3 className="text-xl font-black tracking-tight mt-1 text-navy-950">反則の内容を選択</h3>
              <p className="text-xs text-navy-950/50 mt-1 font-semibold">※「10カウント」は即時失格（負け）になります。</p>
            </div>

            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
              {[
                { label: '当てすぎ', en: 'ATTE-SUGI' },
                { label: '場外', en: 'JOGAI' },
                { label: '時間の空費', en: 'TIME WASTING' },
                { label: '無防備', en: 'MUBOBI' },
                { label: '相手のつかみすぎ', en: 'GRABBING' },
                { label: 'その他のマナー違反', en: 'OTHER VIOLATION' },
                { label: '10カウント', en: '10-COUNT (DISQUALIFIED)' },
              ].map((opt) => (
                <button
                  key={opt.en}
                  onClick={() => {
                    commitEvent(cPenaltyPrompt.side, 'C', opt.label);
                    setCPenaltyPrompt(null);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 font-semibold cursor-pointer",
                    opt.label === '10カウント' 
                      ? "bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-500 text-red-700"
                      : "bg-gray-50 hover:bg-white border-gray-100 hover:border-navy-950/20 text-navy-950"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-extrabold text-sm">{opt.label}</span>
                    <span className="text-[9px] font-mono opacity-60 uppercase tracking-widest">{opt.en}</span>
                  </div>
                  {opt.label === '10カウント' && (
                    <span className="bg-red-600 text-white font-mono font-black text-[9px] px-2 py-1 rounded leading-none">
                      即負け
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCPenaltyPrompt(null)}
              className="w-full py-3 rounded-xl border border-navy-950/10 hover:bg-navy-950/5 text-xs font-black tracking-widest text-navy-950/60 uppercase transition-all cursor-pointer"
            >
              キャンセル / Cancel
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-navy-950 text-navy-950 max-w-sm w-full rounded-[2rem] overflow-hidden shadow-2xl flex flex-col p-8 gap-6 animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 flex items-center justify-center rounded-2xl mx-auto mb-3">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-black tracking-tight text-navy-950">管理者画面への入室</h3>
              <p className="text-xs text-navy-950/50 mt-1 font-semibold">パスワードを入力してください (初期設定: 1234)</p>
            </div>

            <form onSubmit={handleAdminVerify} className="flex flex-col gap-4">
              <div>
                <input 
                  type="password"
                  placeholder="パスワードを入力 / Enter Password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  autoFocus
                  className="w-full text-center px-4 py-3 rounded-xl border border-navy-950/20 focus:border-navy-950 focus:ring-1 focus:ring-navy-950/20 font-black tracking-widest text-lg transition-all"
                />
                {passwordError && (
                  <p className="text-[10px] font-bold text-red-600 mt-2 text-center animate-bounce">{passwordError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-navy-950/10 hover:bg-navy-950/5 text-xs font-black tracking-widest text-navy-950/60 uppercase transition-all cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-navy-950 text-white hover:bg-navy-900 rounded-xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer"
                >
                  認証する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminOpen && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white border-2 border-navy-950 text-navy-950 max-w-2xl w-full max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col p-8 gap-6 animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-navy-950/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 text-white flex items-center justify-center rounded-xl shadow-lg">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-navy-950">管理者画面 / Admin Dashboard</h3>
                  <p className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest leading-none mt-1">Match state, events, and log editing</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAdminOpen(false)}
                className="p-2 hover:bg-navy-950/5 text-navy-950 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Match Overview Stats in Admin Panel */}
            <div className="grid grid-cols-2 gap-4 bg-navy-950/5 p-4 rounded-2xl border border-navy-950/5 shrink-0">
              <div className="flex flex-col items-center justify-center border-r border-navy-950/10 text-center">
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">赤 / {athlete1.name}</span>
                <span className="text-3xl font-mono font-black mt-1 text-navy-950">{calculateScores.AKA.total} <span className="text-xs font-sans text-navy-950/40">点</span></span>
                <span className="text-[10px] font-bold text-navy-950/40 mt-1">反則 C: {calculateScores.AKA.c}</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">青 / {athlete2.name}</span>
                <span className="text-3xl font-mono font-black mt-1 text-navy-950">{calculateScores.AO.total} <span className="text-xs font-sans text-navy-950/40">点</span></span>
                <span className="text-[10px] font-bold text-navy-950/40 mt-1">反則 C: {calculateScores.AO.c}</span>
              </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 min-h-[250px]">
              <div className="text-xs font-black text-navy-950/40 uppercase tracking-widest mb-1">
                得点 ＆ 反則履歴一覧 / Scoring & Penalties History Log ({events.length})
              </div>
              {events.length === 0 ? (
                <div className="flex-1 border-2 border-dashed border-navy-950/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2">
                  <p className="font-extrabold text-sm text-navy-950/40">まだ得点や反則の記録がありません</p>
                  <p className="text-xs text-navy-950/30">試合中に加点・ペナルティが発生するとこちらに一覧表示されます。</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {events.slice().reverse().map((evt) => {
                    const athleteName = evt.side === 'AKA' ? athlete1.name : athlete2.name;
                    const sideColor = evt.side === 'AKA' ? 'border-red-600 text-red-700 bg-red-50/50' : 'border-blue-600 text-blue-700 bg-blue-50/50';
                    const sideBadge = evt.side === 'AKA' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white';
                    
                    let pointsAdded = 0;
                    let penaltyPointsAdded = 0;
                    if (evt.pointType === 'Yuko') pointsAdded = 1;
                    if (evt.pointType === 'Waza-ari') pointsAdded = 2;
                    if (evt.pointType === 'Ippon') pointsAdded = 3;

                    if (evt.pointType === 'C' && evt.penaltyReason !== '10カウント') {
                      const remTime = evt.remainingTime !== undefined ? evt.remainingTime : (settings.duration - evt.timestamp);
                      if (remTime <= 15) {
                        penaltyPointsAdded = evt.penaltyReason === '当てすぎ' ? 1 : 4;
                      }
                    }

                    return (
                      <div 
                        key={evt.id}
                        className={cn(
                          "border-l-4 p-3.5 rounded-xl bg-white border border-navy-950/10 flex items-center justify-between gap-4 transition-all hover:shadow-md",
                          sideColor
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-navy-950/40 bg-navy-950/5 px-2 py-1 rounded-md shrink-0">
                            {formatTime(settings.duration - evt.timestamp)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase", sideBadge)}>
                                {evt.side}
                              </span>
                              <span className="font-black text-xs text-navy-950">{athleteName}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-navy-950/70 font-semibold flex-wrap">
                              <span className="font-black text-navy-950 text-sm">
                                {evt.pointType === 'C' && '反則警告 (C)'}
                                {evt.pointType === 'Yuko' && '有効 (YUKO)'}
                                {evt.pointType === 'Waza-ari' && '技あり (WAZA-ARI)'}
                                {evt.pointType === 'Ippon' && '一本 (IPPON)'}
                              </span>
                              {pointsAdded > 0 && (
                                <span className="font-mono font-black text-emerald-600 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded leading-none border border-emerald-100 shrink-0">
                                  +{pointsAdded}点
                                </span>
                              )}
                              {evt.pointType === 'C' && (
                                <span className="font-mono font-black text-yellow-600 text-[10px] bg-yellow-50 px-1.5 py-0.5 rounded leading-none border border-yellow-100 shrink-0">
                                  C警告
                                </span>
                              )}
                              {penaltyPointsAdded > 0 && (
                                <span className="font-mono font-black text-emerald-600 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded leading-none border border-emerald-100 shrink-0">
                                  相手に+{penaltyPointsAdded}点 (ラスト15秒)
                                </span>
                              )}
                              
                              {(evt.tech !== 'None' || evt.target !== 'None') && (
                                <span className="text-[10px] text-navy-950/40 font-bold tracking-tight">
                                  ({evt.target === 'Jodan' ? '上段' : evt.target === 'Chudan' ? '中段' : ''}•{evt.tech === 'Tsuki' ? '突き' : evt.tech === 'Keri' ? '蹴り' : ''})
                                </span>
                              )}
                              {evt.penaltyReason && (
                                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                  理由: {evt.penaltyReason}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete single action with inline confirmation */}
                        {deletingId === evt.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200 shrink-0">
                            <button
                              onClick={() => {
                                setEvents(prev => prev.filter(e => e.id !== evt.id));
                                setCanUndo(false);
                                setDeletingId(null);
                              }}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              消去する
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-3 py-2 bg-navy-950/5 hover:bg-navy-950/10 text-navy-950 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-navy-950/10"
                            >
                              戻る
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeletingId(evt.id)}
                            className="p-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 border border-red-200/50"
                            title="この得点・反則を消去"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-between items-center border-t border-navy-950/10 pt-4 shrink-0 flex-wrap gap-2">
              <span className="text-[10px] text-navy-950/30 font-black tracking-widest uppercase">
                ※削除後に点数や先取がリアルタイムに再計算されます
              </span>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="px-8 py-3 bg-navy-950 hover:bg-navy-900 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer shadow-md"
              >
                閉じる / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoringPanel({ 
  side, athleteName, score, penalties, last15sPenaltyDotsToFlash = 0,
  activeSide, activeTarget, activeTech, timerActive, isMatchOver,
  onSideToggle, onTargetSelect, onTechSelect, onCommitPoint, onCommitPenalty,
  onSenshuToggle,
  accentColor,
  hasSenshu,
  isWinner,
  isDraw,
  decisionReason
}: { 
  side: 'AKA' | 'AO'; 
  athleteName: string; 
  score: number; 
  penalties: { c: number };
  last15sPenaltyDotsToFlash?: number;
  
  activeSide: 'AKA' | 'AO' | null;
  activeTarget: 'Jodan' | 'Chudan' | 'None';
  activeTech: 'Tsuki' | 'Keri' | 'None';
  timerActive: boolean;
  isMatchOver: boolean;

  onSideToggle: () => void;
  onTargetSelect: (t: 'Jodan' | 'Chudan' | 'None') => void;
  onTechSelect: (t: 'Tsuki' | 'Keri' | 'None') => void;
  onCommitPoint: (pt: 'Yuko' | 'Waza-ari' | 'Ippon') => void;
  onCommitPenalty: () => void;
  onSenshuToggle: () => void;

  accentColor: string;
  hasSenshu?: boolean;
  isWinner?: boolean;
  isDraw?: boolean;
  decisionReason?: string;
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
      <div className="flex flex-col shrink-0 shadow-lg rounded-3xl overflow-hidden bg-white border border-navy-950/5 relative">
        <div className={cn("py-2 text-center text-[10px] font-black tracking-widest uppercase", accentColor)}>
          {side}: {athleteName}
        </div>
        <div className="py-8 flex items-center justify-center gap-6 relative">
          {hasSenshu && (
            <div className="absolute top-2 right-4 flex items-center gap-1.5 animate-in zoom-in duration-300">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 shadow-[0_0_12px_#22c55e] border border-white"></span>
              </span>
              <span className="text-[10px] font-black tracking-[0.15em] text-green-600 uppercase italic">先取 / SENSHU</span>
            </div>
          )}

          {/* C Penalty on Left */}
          <div className="flex flex-col items-center gap-1.5 animate-in slide-in-from-left-4 duration-300">
            <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-200 tracking-wider">C (反則)</span>
            <div className="flex flex-col gap-1.5 p-1.5 bg-navy-950/5 rounded-xl border border-navy-950/5">
              {[1, 2, 3, 4, 5].map((i) => {
                const isActive = penalties.c >= i;
                const isDisqualified = penalties.c >= 5;
                const isFlashing = isDisqualified || last15sPenaltyDotsToFlash >= i;
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-2 transition-all duration-250",
                      isFlashing
                        ? "bg-yellow-400 border-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.9)] scale-110 animate-[pulse_0.8s_infinite]"
                        : isActive 
                          ? "bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.7)] scale-110" 
                          : "bg-white border-navy-950/10"
                    )} 
                  />
                );
              })}
            </div>
          </div>

          {/* Score Value */}
          <div className="text-[140px] font-mono font-black leading-none select-none text-navy-950 px-2">{score}</div>

          {/* SENSHU Indicator on Right */}
          <div className="flex flex-col items-center gap-1.5 animate-in slide-in-from-right-4 duration-300 w-[50px]">
            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-200 tracking-wider">先取</span>
            <div className="flex flex-col items-center justify-center p-1.5 bg-navy-950/5 rounded-xl border border-navy-950/5 w-full h-[106px]">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full border-2 transition-all duration-250 flex items-center justify-center font-black text-xs",
                  hasSenshu 
                    ? "bg-green-500 border-green-400 text-white shadow-[0_0_12px_rgba(34,197,94,0.7)] scale-110" 
                    : "bg-white border-navy-950/10 text-navy-950/20"
                )} 
              >
                SEN
              </div>
            </div>
          </div>
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
          <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm z-30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center gap-4 animate-in zoom-in duration-300">
             {isWinner ? (
               <>
                 <Trophy size={48} className="text-yellow-400 animate-bounce" />
                 <div>
                    <p className="text-yellow-400 font-black text-2xl tracking-tighter uppercase italic">WINNER / 勝者</p>
                    <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em] mt-1">{decisionReason}</p>
                 </div>
               </>
             ) : isDraw ? (
               <>
                 <AlertTriangle size={48} className="text-yellow-500 animate-pulse" />
                 <div>
                    <p className="text-yellow-500 font-black text-lg tracking-tighter uppercase italic">判定必要 / HANTEI</p>
                    <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em] mt-1">審判5人の投票による同点判定へ移行</p>
                 </div>
               </>
             ) : (
               <>
                 <div className="text-white/30 font-black text-lg tracking-tighter uppercase italic animate-pulse">MATCH OVER / 試合終了</div>
                 <p className="text-white/20 font-black text-[8px] uppercase tracking-[0.2em]">Decision: {decisionReason}</p>
               </>
             )}
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
          <PointTrigger 
            label="有効" 
            sub="YUKO" 
            disabled={!canSelectPoint || (activeTech === 'Keri' && (activeTarget === 'Jodan' || activeTarget === 'Chudan'))} 
            onClick={() => onCommitPoint('Yuko')} 
          />
          <PointTrigger 
            label="技あり" 
            sub="WAZA-ARI" 
            disabled={!canSelectPoint || activeTarget === 'Jodan' || (activeTarget === 'Chudan' && activeTech === 'Tsuki')} 
            onClick={() => onCommitPoint('Waza-ari')} 
          />
          <PointTrigger 
            label="一本" 
            sub="IPPON" 
            disabled={!canSelectPoint || (activeTarget === 'Chudan' && activeTech === 'Keri')} 
            onClick={() => onCommitPoint('Ippon')} 
          />
        </div>

        {/* Row 5: Penalties & Manual Senshu Toggle */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-navy-950/10">
           <PenaltyButton 
             label="C (反則)" 
             count={penalties.c} 
             flashCount={last15sPenaltyDotsToFlash}
             disabled={!isSelected || timerActive} 
             onClick={() => onCommitPenalty()} 
           />
           <SenshuToggleButton active={!!hasSenshu} disabled={!isSelected || timerActive} onClick={onSenshuToggle} />
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
        disabled 
          ? "bg-gray-50 border-gray-100 text-navy-950/20 cursor-not-allowed opacity-40"
          : active 
            ? "bg-navy-950 text-white border-navy-950 shadow-lg ring-2 ring-navy-950/20" 
            : "bg-white border-navy-950/35 text-navy-950 hover:bg-navy-50/50 hover:border-navy-950"
      )}
    >
      <span className="text-2xl tracking-tighter">{label}</span>
      <span className="text-[8px] font-mono opacity-50 leading-none uppercase">{sub}</span>
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

function PenaltyButton({ 
  label, 
  count, 
  flashCount = 0,
  disabled, 
  onClick 
}: { 
  label: string; 
  count: number; 
  flashCount?: number;
  disabled: boolean; 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between p-4 rounded-2xl transition-all border-2 shadow-sm group",
        disabled 
          ? "bg-gray-50 border-gray-100 text-navy-950/20 cursor-not-allowed opacity-40"
          : "bg-white border-navy-950/35 text-navy-950 hover:bg-navy-50/50 hover:border-navy-950 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2 text-left">
        <AlertTriangle size={16} className={cn("transition-colors", (count > 0 || flashCount > 0) ? "text-yellow-500" : (disabled ? "text-navy-950/10" : "text-navy-950/40 group-hover:text-yellow-600"))} />
        <span className={cn("font-black text-xs uppercase tracking-widest transition-colors", disabled ? "text-navy-950/20" : "text-navy-950")}>{label}</span>
      </div>
      <div className="flex gap-1 shrink-0">
        {[1,2,3,4,5].map(i => {
          const isDisqualified = count >= 5;
          const isFlashing = isDisqualified || flashCount >= i;
          const isActive = count >= i;
          return (
            <div key={i} className={cn(
              "w-2.5 h-2.5 rounded-full border transition-all",
              isFlashing
                ? "bg-yellow-500 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.6)] animate-[pulse_0.8s_infinite]"
                : isActive 
                  ? "bg-yellow-500 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.4)]" 
                  : "bg-gray-200 border-gray-300"
            )} />
          );
        })}
      </div>
    </button>
  );
}

function SenshuToggleButton({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
  const isPassiveActive = disabled && active;

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between p-4 rounded-2xl transition-all border-2 shadow-sm group",
        isPassiveActive
          ? "bg-green-50 border-green-200 text-green-900 opacity-90 cursor-not-allowed"
          : disabled 
            ? "bg-gray-50 border-gray-100 text-navy-950/20 cursor-not-allowed opacity-40"
            : active 
              ? "bg-green-600 border-green-600 text-white shadow-md cursor-pointer" 
              : "bg-white border-navy-950/35 text-navy-950 hover:bg-navy-50/50 hover:border-navy-950 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2 text-left">
        <Trophy 
          size={16} 
          className={cn(
            "transition-colors", 
            isPassiveActive 
              ? "text-green-600 animate-pulse"
              : active 
                ? "text-white animate-pulse" 
                : (disabled ? "text-navy-950/10" : "text-navy-950/40 group-hover:text-green-600")
          )} 
        />
        <span 
          className={cn(
            "font-black text-xs uppercase tracking-widest transition-colors", 
            isPassiveActive
              ? "text-green-900"
              : active 
                ? "text-white" 
                : "text-navy-950"
          )}
        >
          先取
        </span>
      </div>
      <span 
        className={cn(
          "text-xs font-black transition-colors", 
          isPassiveActive
            ? "text-green-700"
            : active 
              ? "text-white" 
              : "text-navy-950/60"
        )}
      >
        {active ? "オン / ON" : "オフ / OFF"}
      </span>
    </button>
  );
}
