import React, { useState } from 'react';
import { Athlete, MatchSettings as IMatchSettings } from '../types';
import { Clock, Target, Zap, ChevronRight, User, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchSettingsProps {
  athlete1: Athlete;
  athlete2: Athlete;
  onConfirm: (settings: IMatchSettings) => void;
  onBack: () => void;
}

export default function MatchSettings({ athlete1, athlete2, onConfirm, onBack }: MatchSettingsProps) {
  const [duration, setDuration] = useState(180); // 3 mins default
  const [targetScore, setTargetScore] = useState(8);
  const [pointGap, setPointGap] = useState(8);
  const [senshuEnabled, setSenshuEnabled] = useState(true);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="col-span-12 grid grid-cols-2 gap-4 mb-4">
           <AthleteCard athlete={athlete1} side="AKA" color="bg-red-600" onChange={onBack} />
           <AthleteCard athlete={athlete2} side="AO" color="bg-blue-600" onChange={onBack} />
        </div>

        {/* Duration (Dial Slider) */}
        <div className="col-span-12 bg-gray-50 border border-navy-950/5 p-8 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Clock className="text-navy-950" size={24} />
              <h3 className="font-black text-lg uppercase tracking-widest text-navy-950">DURATION</h3>
            </div>
            <div className="text-6xl font-mono font-black text-navy-950 tabular-nums">
              {formatTime(duration)}
            </div>
          </div>
          <div className="space-y-6">
            <input 
              type="range" 
              min="0" 
              max="599" 
              step="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-12 accent-navy-950 cursor-pointer"
            />
            <div className="flex justify-between text-xs font-black text-navy-950/30 uppercase tracking-[0.2em]">
              <span>0:00</span>
              <span>2:00</span>
              <span>4:00</span>
              <span>6:00</span>
              <span>8:00</span>
              <span>9:59</span>
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
          className="bg-yellow-400 text-navy-950 px-20 py-6 rounded-full font-black text-xl tracking-[0.2em] shadow-2xl hover:bg-yellow-300 transition-all active:scale-95 flex items-center gap-4 group"
        >
          READY TO FIGHT
          <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
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
        onClick={onChange}
        className="p-4 bg-gray-50 text-navy-950/40 hover:text-navy-950 hover:bg-white border border-navy-950/5 rounded-2xl transition-all flex flex-col items-center gap-1 group-hover:border-navy-950/20"
      >
        <RefreshCcw size={16} />
        <span className="text-[8px] font-black uppercase tracking-widest">Change</span>
      </button>
    </div>
  );
}
