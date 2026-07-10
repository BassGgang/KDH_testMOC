import React, { useState, useEffect } from 'react';
import { Athlete, MatchSettings as IMatchSettings } from '../types';
import { 
  Clock, Target, Zap, ChevronRight, User, RefreshCcw, 
  ChevronUp, ChevronDown, Play, Pause, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchSettingsProps {
  athlete1: Athlete;
  athlete2: Athlete;
  onConfirm: (settings: IMatchSettings) => void;
  onBack: () => void;
  initialSettings?: IMatchSettings;
}

export default function MatchSettings({ athlete1, athlete2, onConfirm, onBack, initialSettings }: MatchSettingsProps) {
  const [duration, setDuration] = useState(initialSettings?.duration ?? 180); // 3 mins default (in seconds)
  const [targetScore, setTargetScore] = useState(initialSettings?.targetScore ?? 8);
  const [pointGap, setPointGap] = useState(initialSettings?.pointGap ?? 8);
  const [senshuEnabled, setSenshuEnabled] = useState(initialSettings?.senshuEnabled ?? true);

  // Timer run loop states inside setup
  const [isRunning, setIsRunning] = useState(false);
  const [resetDuration, setResetDuration] = useState(initialSettings?.duration ?? 180);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);

  // Compute individual digits
  const minutes = Math.floor(duration / 60);
  const secondsRem = duration % 60;

  const d1 = Math.floor(minutes / 10);      // 10 mins digit
  const d2 = minutes % 10;                  // 1 min digit
  const d3 = Math.floor(secondsRem / 10);   // 10 secs digit
  const d4 = secondsRem % 10;               // 1 sec digit

  // Keep track of countdown ticks
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setDuration((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setShowTimeUpAlert(true);
            // Play a native buzzer sound
            try {
              const context = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = context.createOscillator();
              const gain = context.createGain();
              osc.connect(gain);
              gain.connect(context.destination);
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(650, context.currentTime); // Buzzer sound frequency
              gain.gain.setValueAtTime(0.2, context.currentTime);
              osc.start();
              osc.stop(context.currentTime + 1.5);
            } catch (err) {
              console.warn('Audio Context API not supported/active:', err);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Combined digit update helper
  const updateDigits = (newD1: number, newD2: number, newD3: number, newD4: number) => {
    const totalSecs = (newD1 * 10 + newD2) * 60 + (newD3 * 10 + newD4);
    
    // Strict upper limit 99m 59s: (99 * 60) + 59 = 5999 seconds
    const cappedSecs = Math.min(totalSecs, 5999);
    setDuration(cappedSecs);
    setShowTimeUpAlert(false);

    if (!isRunning) {
      setResetDuration(cappedSecs);
    }
  };

  // Up/Down adjustments
  const adjustD1 = (up: boolean) => {
    let next = d1;
    if (up) {
      next = (next + 1) % 10;
    } else {
      next = (next - 1 + 10) % 10;
    }
    updateDigits(next, d2, d3, d4);
  };

  const adjustD2 = (up: boolean) => {
    let next = d2;
    if (up) {
      next = (next + 1) % 10;
    } else {
      next = (next - 1 + 10) % 10;
    }
    updateDigits(d1, next, d3, d4);
  };

  const adjustD3 = (up: boolean) => {
    // Special rule: tens of seconds digit must loop between 0 and 5 Only (0 to 59s)
    let next = d3;
    if (up) {
      next = (next + 1) % 6;
    } else {
      next = (next - 1 + 6) % 6;
    }
    updateDigits(d1, d2, next, d4);
  };

  const adjustD4 = (up: boolean) => {
    let next = d4;
    if (up) {
      next = (next + 1) % 10;
    } else {
      next = (next - 1 + 10) % 10;
    }
    updateDigits(d1, d2, d3, next);
  };

  const handleReset = () => {
    setIsRunning(false);
    setDuration(resetDuration);
    setShowTimeUpAlert(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Time Up Alert Overlay/Banner */}
      {showTimeUpAlert && (
        <div className="mb-8 p-4 bg-red-600 border border-red-500 rounded-3xl text-white flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="animate-bounce" size={24} />
            <div>
              <p className="font-black text-sm uppercase tracking-widest">TIME UP / 試合時間終了！</p>
              <p className="text-xs font-bold opacity-80">設定された時間が経過しました。終了のホーンが鳴動しました。</p>
            </div>
          </div>
          <button 
            onClick={() => setShowTimeUpAlert(false)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-xl font-bold text-xs uppercase cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-navy-950 uppercase italic">Match Setup</h1>
          <p className="text-navy-950/40 font-black text-xs uppercase tracking-[0.3em]">Configure fight rules & verify athletes</p>
        </div>
        <button 
          onClick={onBack}
          className="text-navy-950/40 hover:text-navy-950 font-black text-[10px] uppercase tracking-widest transition-colors mb-2"
        >
          [ Cancel and Exit ]
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Athlete Preview Cards */}
        <div className="col-span-12 grid grid-cols-2 gap-4 mb-2">
           <AthleteCard athlete={athlete1} side="AKA" color="bg-red-600" onChange={onBack} />
           <AthleteCard athlete={athlete2} side="AO" color="bg-blue-600" onChange={onBack} />
        </div>

        {/* Custom Digital Countdown/Duration Setup Block (Sporty Dark Mode Theme) */}
        <div className="col-span-12 bg-zinc-950 border border-zinc-900 p-8 rounded-[2.5rem] shadow-2xl text-white transition-all">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-800 text-white rounded-2xl shadow-lg border border-zinc-700">
                <Clock size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-black text-base uppercase tracking-widest text-white">MATCH DURATION</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  各桁の上下ボタンを押して時間を自由に設定してください (最大99分59秒)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-zinc-700">
                デジタルコントローラー
              </span>
            </div>
          </div>

          {/* Core Multi-Digit Adjuster Interface */}
          <div className="flex flex-col items-center justify-center gap-8 py-4">
            <div className="flex items-center justify-center gap-4 sm:gap-6 bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] shadow-inner relative overflow-hidden">
              {/* Background ambient subtle glow */}
              <div className="absolute inset-0 bg-white/5 filter blur-3xl pointer-events-none" />

              {/* Minute Tens */}
              <DigitSelector 
                value={d1} 
                onUp={() => adjustD1(true)} 
                onDown={() => adjustD1(false)} 
                label="10分" 
              />

              {/* Minute Units */}
              <DigitSelector 
                value={d2} 
                onUp={() => adjustD2(true)} 
                onDown={() => adjustD2(false)} 
                label="1分" 
              />

              {/* Splitting Colon */}
              <div className="flex flex-col items-center justify-center text-5xl sm:text-6xl font-black text-white/80 animate-pulse select-none px-1 h-32 pt-6">
                :
              </div>

              {/* Seconds Tens (Loops 0-5) */}
              <DigitSelector 
                value={d3} 
                onUp={() => adjustD3(true)} 
                onDown={() => adjustD3(false)} 
                label="10秒" 
                isSpecial
              />

              {/* Seconds Units */}
              <DigitSelector 
                value={d4} 
                onUp={() => adjustD4(true)} 
                onDown={() => adjustD4(false)} 
                label="1秒" 
              />
            </div>

            {/* Run Controls Inside Setup for testing/custom usage */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
              {/* Start Stop Button */}
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "px-8 py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center gap-2.5 transition-all shadow-xl active:scale-95 cursor-pointer",
                  isRunning 
                    ? "bg-red-600 hover:bg-red-500 text-white ring-4 ring-red-600/20" 
                    : "bg-white hover:bg-zinc-100 text-zinc-950 ring-4 ring-white/10"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause size={18} fill="currentColor" strokeWidth={0} />
                    <span>ストップ / STOP</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" strokeWidth={0} />
                    <span>スタート / START</span>
                  </>
                )}
              </button>

              {/* Reset Button */}
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl border border-zinc-700 font-bold text-sm tracking-widest uppercase flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>リセット / RESET</span>
              </button>
            </div>
          </div>
        </div>

        {/* Point Limit & Senshu Block */}
        <div className="col-span-7 bg-gray-50 border border-navy-950/5 p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="text-navy-950" size={24} />
              <h3 className="font-black text-lg uppercase tracking-widest text-navy-950">POINT LIMIT</h3>
            </div>
            <div className="text-4xl font-mono font-black text-navy-950">{targetScore} PTS</div>
          </div>
          
          <input 
            type="range" 
            min="1" 
            max="15" 
            step="1"
            value={targetScore}
            onChange={(e) => setTargetScore(parseInt(e.target.value))}
            className="w-full h-8 accent-navy-950 cursor-pointer"
          />

          <div className="pt-6 border-t border-navy-950/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy-950 text-white flex items-center justify-center rounded-xl shadow-lg">
                <Zap size={20} fill="currentColor" strokeWidth={0} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-navy-950">SENSHU (先取)</h3>
                <p className="text-[10px] font-black text-navy-950/30 uppercase">First score advantage</p>
              </div>
            </div>
            <button 
              onClick={() => setSenshuEnabled(!senshuEnabled)}
              className={cn(
                "w-16 h-8 rounded-full p-1 transition-all duration-300",
                senshuEnabled ? "bg-navy-950" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300",
                senshuEnabled ? "translate-x-8" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Victory Criteria (Senshu/SA Buttons) */}
        <div className="col-span-5 bg-gray-50 border border-navy-950/5 p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-6 text-navy-950">
          <h3 className="font-black text-lg uppercase tracking-widest text-center">勝利条件設定</h3>
          <div className="grid grid-cols-1 gap-4 flex-1">
            <button 
              onClick={() => { setPointGap(0); setSenshuEnabled(true); }}
              className={cn(
                "py-6 rounded-3xl font-black text-lg transition-all border-2 flex items-center justify-center gap-3",
                pointGap === 0 && senshuEnabled
                  ? "bg-navy-950 text-white border-navy-950 shadow-xl" 
                  : "bg-white text-navy-950/40 border-navy-950/5 hover:border-navy-950/20"
              )}
            >
              <Zap size={20} />
              先き取り
            </button>
            <button 
              onClick={() => setPointGap(8)}
              className={cn(
                "py-6 rounded-3xl font-black text-lg transition-all border-2 flex items-center justify-center gap-3",
                pointGap > 0 
                  ? "bg-navy-950 text-white border-navy-950 shadow-xl" 
                  : "bg-white text-navy-950/40 border-navy-950/5 hover:border-navy-950/20"
              )}
            >
              <Target size={20} />
              差 (SA)
            </button>
          </div>
          <p className="text-[10px] font-black text-center text-navy-950/30 uppercase tracking-widest">Select primary tie-break / win rule</p>
        </div>
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={() => onConfirm({ duration, targetScore, pointGap, senshuEnabled })}
          className="bg-yellow-400 text-navy-950 px-20 py-6 rounded-full font-black text-xl tracking-[0.2em] shadow-2xl hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-4 group cursor-pointer"
        >
          READY TO FIGHT
          <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// Single Digit Selector Sub-component
function DigitSelector({ 
  value, onUp, onDown, label, isSpecial = false 
}: { 
  value: number; onUp: () => void; onDown: () => void; label: string; isSpecial?: boolean 
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      {/* Target digit description label */}
      <span className="text-[9px] font-black text-zinc-500 tracking-wider uppercase block text-center mb-0.5">
        {label}
      </span>

      {/* Up Button */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onUp(); }}
        className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-11 h-8 rounded-lg flex items-center justify-center transition-all border border-zinc-700/60 shadow-md active:scale-90 cursor-pointer"
        title={`${label}を増やす`}
      >
        <ChevronUp size={20} strokeWidth={3.5} />
      </button>

      {/* Main digit capsule display */}
      <div className="w-14 sm:w-16 h-20 sm:h-22 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden group">
        {/* Futuristic glowing frame */}
        <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors pointer-events-none rounded-xl" />
        
        {/* Subtle grid pattern for authentic LCD styling */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

        <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tighter tabular-nums select-none relative z-10 transition-transform duration-200 group-hover:scale-105">
          {value}
        </span>
      </div>

      {/* Down Button */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onDown(); }}
        className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-11 h-8 rounded-lg flex items-center justify-center transition-all border border-zinc-700/60 shadow-md active:scale-90 cursor-pointer"
        title={`${label}を減らす`}
      >
        <ChevronDown size={20} strokeWidth={3.5} />
      </button>
    </div>
  );
}

function AthleteCard({ athlete, side, color, onChange }: { athlete: Athlete, side: string, color: string, onChange: () => void }) {
  return (
    <div className="bg-white border border-navy-950/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm group">
      <div className="flex items-center gap-6">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg", color)}>
          {side}
        </div>
        <div>
          <p className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest mb-1">{athlete.affiliation}</p>
          <h4 className="text-2xl font-black text-navy-950 tracking-tight leading-tight">{athlete.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <User size={12} className="text-navy-950/40" />
            <span className="text-[10px] font-black text-navy-950/40 uppercase">{athlete.rank}</span>
          </div>
        </div>
      </div>
      <button 
        type="button"
        onClick={onChange}
        className="p-4 bg-gray-50 text-navy-950/40 hover:text-navy-950 hover:bg-white border border-navy-950/5 rounded-2xl transition-all flex flex-col items-center gap-1 group-hover:border-navy-950/20 cursor-pointer"
      >
        <RefreshCcw size={16} />
        <span className="text-[8px] font-black uppercase tracking-widest">Change</span>
      </button>
    </div>
  );
}
