import React, { useState } from 'react';
import { User, CheckCircle, Crosshair, Search } from 'lucide-react';
import { Athlete } from '../types';
import { cn } from '../lib/utils';

const MOCK_ATHLETES: Athlete[] = [
  { id: '1', name: '田中 健太', rank: '1st Dan', affiliation: '極真館 東京', stats: { attack: 85, defense: 70, speed: 90, stamina: 80, winRate: 75 }, history: [] },
  { id: '2', name: '佐藤 文哉', rank: '2nd Dan', affiliation: '正道会館', stats: { attack: 78, defense: 85, speed: 75, stamina: 88, winRate: 68 }, history: [] },
  { id: '3', name: '高橋 雄大', rank: '1st Dan', affiliation: '松濤館', stats: { attack: 92, defense: 60, speed: 95, stamina: 70, winRate: 82 }, history: [] },
  { id: '4', name: '渡辺 真司', rank: 'Brown', affiliation: '和道流', stats: { attack: 70, defense: 90, speed: 65, stamina: 95, winRate: 60 }, history: [] },
];

export default function MatchSelection({ onSelect }: { onSelect: (p1: Athlete, p2: Athlete) => void }) {
  const [selected, setSelected] = useState<Athlete[]>([]);

  const toggleSelect = (athlete: Athlete) => {
    if (selected.find(a => a.id === athlete.id)) {
      setSelected(selected.filter(a => a.id !== athlete.id));
    } else if (selected.length < 2) {
      setSelected([...selected, athlete]);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="space-y-2">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Phase 01: Match Selection</h2>
        <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">対戦カードを選択し、試合準備を開始してください</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_ATHLETES.map((athlete) => {
          const isSelected = selected.find(a => a.id === athlete.id);
          const selectionIndex = selected.findIndex(a => a.id === athlete.id);

          return (
            <div 
              key={athlete.id}
              onClick={() => toggleSelect(athlete)}
              className={cn(
                "border-2 p-6 transition-all cursor-pointer relative group",
                isSelected ? "border-navy-950 bg-navy-950 text-white" : "border-navy-950/10 hover:border-navy-950"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 bg-white text-navy-950 w-6 h-6 flex items-center justify-center font-black text-xs">
                  {selectionIndex + 1}
                </div>
              )}
              <div className={cn("inline-block p-2 mb-4", isSelected ? "bg-white/10" : "bg-navy-950/5")}>
                <User size={24} />
              </div>
              <h3 className="font-bold text-lg leading-tight mb-1">{athlete.name}</h3>
              <p className={cn("text-xs font-bold uppercase", isSelected ? "text-white/40" : "text-navy-950/40")}>
                {athlete.rank} | {athlete.affiliation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-navy-950/5 p-8 border border-navy-950/10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-12">
          <AthleteSlot label="AKA (Red)" athlete={selected[0]} color="bg-red-600" />
          <div className="text-2xl font-black italic text-navy-950/20">VS</div>
          <AthleteSlot label="AO (Blue)" athlete={selected[1]} color="bg-blue-600" />
        </div>

        <button 
          disabled={selected.length < 2}
          onClick={() => onSelect(selected[0], selected[1])}
          className="bg-navy-950 text-white px-10 py-4 font-black tracking-widest uppercase hover:bg-navy-900 transition-all disabled:opacity-20 flex items-center gap-3"
        >
          Match Start
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

function AthleteSlot({ label, athlete, color }: { label: string; athlete?: Athlete; color: string }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-navy-950/40 mb-2 block">{label}</span>
      <div className={cn("w-48 h-16 border-l-4 flex items-center px-4 font-bold bg-white shadow-sm", athlete ? `border-${color.split('-')[1]}-600` : "border-navy-950/10 border-dashed")}>
        {athlete ? athlete.name : "PENDING..."}
      </div>
    </div>
  );
}

function ArrowRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
