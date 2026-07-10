import React, { useState } from 'react';
import { User, X } from 'lucide-react';
import { Athlete } from '../types';
import { cn } from '../lib/utils';
import { MOCK_ATHLETES } from '../data/athletes';

function getBeltStyle(rank: string) {
  if (rank.includes('茶')) return { dot: 'bg-amber-800' };
  if (rank.includes('紫')) return { dot: 'bg-purple-600' };
  if (rank.includes('緑')) return { dot: 'bg-green-600' };
  if (rank.includes('青') || rank.includes('水色')) return { dot: 'bg-sky-500' };
  if (rank.includes('黄')) return { dot: 'bg-yellow-400' };
  return { dot: 'bg-neutral-300' }; // 白帯 / 無級
}

export default function MatchSelection({ onSelect }: { onSelect: (p1: Athlete, p2: Athlete) => void }) {
  // selected holds two slots: index 0 is AKA (Red), index 1 is AO (Blue)
  const [selected, setSelected] = useState<(Athlete | null)[]>([null, null]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDragOver0, setIsDragOver0] = useState(false);
  const [isDragOver1, setIsDragOver1] = useState(false);
  const [displayMode, setDisplayMode] = useState<'kana' | 'belt' | 'grade'>('kana');

  const getGojuonRow = (athlete: Athlete): string => {
    const kana = athlete.kana || '';
    if (!kana) return 'その他';
    const firstChar = kana.charAt(0);
    if ('あいうえお'.includes(firstChar)) return 'あ行';
    if ('かきくけこがぎぐげご'.includes(firstChar)) return 'か行';
    if ('さしすせそざじずぜぞ'.includes(firstChar)) return 'さ行';
    if ('たちつてとだぢづでど'.includes(firstChar)) return 'た行';
    if ('なにぬねの'.includes(firstChar)) return 'な行';
    if ('はひふへほばびぶべぼぱぴぷぺぽ'.includes(firstChar)) return 'は行';
    if ('まみむめも'.includes(firstChar)) return 'ま行';
    if ('やゆよ'.includes(firstChar)) return 'や行';
    if ('らりるれろ'.includes(firstChar)) return 'ら行';
    if ('わをん'.includes(firstChar)) return 'わ行';
    return 'その他';
  };

  const getBeltGroup = (athlete: Athlete): string => {
    const rank = athlete.rank;
    if (rank.includes('茶')) return '茶帯 (1級〜3級)';
    if (rank.includes('紫')) return '紫帯 (4級)';
    if (rank.includes('緑')) return '緑帯 (5級〜6級)';
    if (rank.includes('青') || rank.includes('水色')) return '青・水色帯 (7級〜8級)';
    if (rank.includes('黄')) return '黄帯 (9級〜10級)';
    return '白帯 (無級)';
  };

  const toggleSelect = (athlete: Athlete) => {
    // Check if currently selected in either slot
    const existingIndex = selected.findIndex(a => a?.id === athlete.id);
    if (existingIndex !== -1) {
      // Unselect it
      setSelected(prev => {
        const next = [...prev];
        next[existingIndex] = null;
        return next;
      });
    } else {
      // Find empty slot, otherwise overwrite AO (Blue)
      setSelected(prev => {
        const next = [...prev];
        if (!next[0]) {
          next[0] = athlete;
        } else if (!next[1]) {
          next[1] = athlete;
        } else {
          next[1] = athlete; // Overwrite second slot
        }
        return next;
      });
    }
  };

  const handleClearSlot = (index: number) => {
    setSelected(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  // Group and sort athletes based on displayMode
  let groupedAthletes: { title: string; list: Athlete[] }[] = [];

  if (displayMode === 'kana') {
    const hiraganaRows = ['あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行', 'その他'];
    const groups: Record<string, Athlete[]> = {};
    hiraganaRows.forEach(row => { groups[row] = []; });
    
    MOCK_ATHLETES.forEach(athlete => {
      const row = getGojuonRow(athlete);
      groups[row].push(athlete);
    });
    
    hiraganaRows.forEach(row => {
      groups[row].sort((a, b) => (a.kana || '').localeCompare(b.kana || '', 'ja'));
    });
    
    groupedAthletes = hiraganaRows
      .map(row => ({ title: row, list: groups[row] }))
      .filter(g => g.list.length > 0);

  } else if (displayMode === 'belt') {
    const beltSequence = [
      '茶帯 (1級〜3級)', 
      '紫帯 (4級)', 
      '緑帯 (5級〜6級)', 
      '青・水色帯 (7級〜8級)', 
      '黄帯 (9級〜10級)', 
      '白帯 (無級)'
    ];
    const groups: Record<string, Athlete[]> = {};
    beltSequence.forEach(b => { groups[b] = []; });
    
    MOCK_ATHLETES.forEach(athlete => {
      const group = getBeltGroup(athlete);
      groups[group].push(athlete);
    });
    
    beltSequence.forEach(b => {
      groups[b].sort((a, b) => (a.kana || '').localeCompare(b.kana || '', 'ja'));
    });
    
    groupedAthletes = beltSequence
      .map(b => ({ title: b, list: groups[b] }))
      .filter(g => g.list.length > 0);

  } else { // grade
    const gradeSequence = [
      '中学3年', '中学2年', '中学1年', 
      '小学6年', '小学5年', '小学4年', '小学3年', '小学2年', '小学1年'
    ];
    const groups: Record<string, Athlete[]> = {};
    gradeSequence.forEach(g => { groups[g] = []; });
    
    MOCK_ATHLETES.forEach(athlete => {
      const affiliation = athlete.affiliation;
      if (groups[affiliation]) {
        groups[affiliation].push(athlete);
      } else {
        if (!groups['その他']) groups['その他'] = [];
        groups['その他'].push(athlete);
      }
    });
    
    gradeSequence.forEach(g => {
      groups[g].sort((a, b) => (a.kana || '').localeCompare(b.kana || '', 'ja'));
    });
    
    groupedAthletes = gradeSequence
      .map(g => ({ title: g, list: groups[g] }))
      .filter(g => g.list.length > 0);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-navy-950/10 pb-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-navy-950">Phase 01: Match Selection</h2>
          <p className="text-navy-950/40 font-bold uppercase tracking-widest text-[10px]">
            ドラッグ＆ドロップ、またはクリックで赤・青の枠に選手を配置してください
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex bg-navy-950 text-white font-mono font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider">
            登録選手数: {MOCK_ATHLETES.length}名
          </span>
        </div>
      </div>

      {/* Versus top dock */}
      <div className="bg-navy-950/5 p-6 border border-navy-950/10 flex flex-col xl:flex-row items-center justify-between gap-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 justify-center w-full xl:w-auto">
          
          {/* AKA Red Slot */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver0(true);
            }}
            onDragLeave={() => setIsDragOver0(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver0(false);
              const id = e.dataTransfer.getData("text/plain");
              const athlete = MOCK_ATHLETES.find(a => a.id === id);
              if (athlete) {
                setSelected(prev => {
                  const next = [...prev];
                  // Avoid duplicate player in second slot
                  if (next[1]?.id === athlete.id) {
                    next[1] = null;
                  }
                  next[0] = athlete;
                  return next;
                });
              }
            }}
            className={cn(
              "p-1.5 rounded-2xl border-2 transition-all duration-200 w-full sm:w-64 bg-white",
              isDragOver0 
                ? "border-red-600 bg-red-50/50 scale-[1.03] shadow-md" 
                : "border-navy-950/10"
            )}
          >
            <AthleteSlot 
              label="赤コーナー (AKA / RED)" 
              athlete={selected[0]} 
              color="bg-red-600" 
              onClear={() => handleClearSlot(0)}
            />
          </div>

          <div className="text-xl font-black italic text-navy-950/20 select-none py-2">VS</div>

          {/* AO Blue Slot */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver1(true);
            }}
            onDragLeave={() => setIsDragOver1(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver1(false);
              const id = e.dataTransfer.getData("text/plain");
              const athlete = MOCK_ATHLETES.find(a => a.id === id);
              if (athlete) {
                setSelected(prev => {
                  const next = [...prev];
                  // Avoid duplicate player in first slot
                  if (next[0]?.id === athlete.id) {
                    next[0] = null;
                  }
                  next[1] = athlete;
                  return next;
                });
              }
            }}
            className={cn(
              "p-1.5 rounded-2xl border-2 transition-all duration-200 w-full sm:w-64 bg-white",
              isDragOver1 
                ? "border-blue-600 bg-blue-50/50 scale-[1.03] shadow-md" 
                : "border-navy-950/10"
            )}
          >
            <AthleteSlot 
              label="青コーナー (AO / BLUE)" 
              athlete={selected[1]} 
              color="bg-blue-600" 
              onClear={() => handleClearSlot(1)}
            />
          </div>
        </div>

        <button 
          disabled={!selected[0] || !selected[1]}
          onClick={() => {
            if (selected[0] && selected[1]) {
              onSelect(selected[0], selected[1]);
            }
          }}
          className="w-full xl:w-auto bg-navy-950 text-white px-10 py-4 font-black tracking-widest uppercase hover:bg-navy-900 transition-all disabled:opacity-20 flex items-center justify-center gap-3 active:scale-95 disabled:pointer-events-none rounded-xl h-[68px] shrink-0 animate-in fade-in zoom-in duration-300"
        >
          Match Start
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Grid count & Reset filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
        <span className="font-extrabold text-navy-950/60 uppercase">
          選手一覧: {MOCK_ATHLETES.length}名
        </span>
        <div className="flex bg-navy-950/5 p-1 rounded-xl border border-navy-950/10 w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setDisplayMode('kana')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
              displayMode === 'kana' 
                ? "bg-navy-950 text-white shadow" 
                : "text-navy-950/50 hover:text-navy-950 hover:bg-navy-950/5"
            )}
          >
            あいうえお順
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('belt')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
              displayMode === 'belt' 
                ? "bg-navy-950 text-white shadow" 
                : "text-navy-950/50 hover:text-navy-950 hover:bg-navy-950/5"
            )}
          >
            帯の順
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('grade')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
              displayMode === 'grade' 
                ? "bg-navy-950 text-white shadow" 
                : "text-navy-950/50 hover:text-navy-950 hover:bg-navy-950/5"
            )}
          >
            学年順
          </button>
        </div>
      </div>

      {/* Scrollable Window for Athletes */}
      <div className="max-h-[500px] overflow-y-auto pr-3 border border-navy-950/10 rounded-2xl p-4 bg-navy-950/5 shadow-inner">
        {groupedAthletes.length === 0 ? (
          <div className="border border-dashed border-navy-950/20 py-16 text-center rounded-3xl bg-white animate-in fade-in duration-300">
            <p className="font-black tracking-wider text-sm text-navy-950/40 uppercase">該当する選手が見つかりませんでした</p>
            <p className="text-xs text-navy-950/30 font-semibold mt-1">別のキーワードやフィルターでお試しください</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-300">
            {groupedAthletes.map((group) => (
              <div key={group.title} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex bg-navy-950 text-white font-black text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider leading-none shadow">
                    {group.title}
                  </span>
                  <div className="h-[2px] bg-navy-950/10 flex-1" />
                  <span className="text-[10px] font-black text-navy-950/30 uppercase tracking-widest">{group.list.length}名</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.list.map((athlete) => {
                    const isSelected = selected.some(a => a?.id === athlete.id);
                    const isAka = selected[0]?.id === athlete.id;
                    const isAo = selected[1]?.id === athlete.id;
                    const isDraggingThis = draggingId === athlete.id;

                    return (
                      <div 
                        key={athlete.id}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", athlete.id);
                          setDraggingId(athlete.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => toggleSelect(athlete)}
                        className={cn(
                          "border-2 p-5 transition-all duration-200 cursor-grab active:cursor-grabbing relative group rounded-2xl flex flex-col justify-between h-[170px] select-none",
                          isDraggingThis && "opacity-30 border-dashed border-navy-950/20 scale-95",
                          !isDraggingThis && (
                            isSelected 
                              ? (isAka ? "border-red-600 bg-red-50 text-navy-950 shadow-md" : "border-blue-600 bg-blue-50 text-navy-950 shadow-md") 
                              : "border-navy-950/10 bg-white hover:border-navy-950 hover:shadow-md hover:scale-[1.01]"
                          )
                        )}
                      >
                        {isSelected && (
                          <div className={cn(
                            "absolute top-4 right-4 text-white w-6 h-6 flex items-center justify-center font-black text-xs rounded-full shadow-md animate-in zoom-in duration-200",
                            isAka ? "bg-red-600" : "bg-blue-600"
                          )}>
                            {isAka ? '赤' : '青'}
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className={cn(
                              "p-1.5 rounded-lg shrink-0 flex items-center gap-1", 
                              isSelected ? "bg-navy-950/10 text-navy-950" : "bg-navy-950/5 text-navy-950"
                            )}>
                              <User size={14} />
                              <span className="text-[8px] font-black tracking-wider uppercase opacity-60">DRAG</span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", 
                              isSelected ? "bg-navy-950/10 text-navy-950" : "bg-green-100 text-green-800"
                            )}>
                              勝率: {athlete.stats.winRate}%
                            </span>
                          </div>
                          <h3 className="font-black text-lg tracking-tight leading-tight mb-1">{athlete.name}</h3>
                          <p className="text-xs font-bold text-navy-950/50 leading-tight">
                            {athlete.affiliation}
                          </p>
                        </div>

                        {/* Rank and color dot */}
                        <div className="flex items-center justify-between border-t border-navy-950/5 pt-3 mt-auto w-full">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "w-2.5 h-2.5 rounded-full ring-2 shrink-0 transition-all ring-navy-950/10",
                              getBeltStyle(athlete.rank).dot
                            )} />
                            <span className="text-[10px] font-bold tracking-wide text-navy-950/80">
                              {athlete.rank}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] font-bold leading-none text-navy-950/40">ATK {athlete.stats.attack}</span>
                              <span className="text-[8px] font-bold leading-none mt-1 text-navy-950/40">DEF {athlete.stats.defense}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}

function AthleteSlot({ label, athlete, color, onClear }: { label: string; athlete?: Athlete | null; color: string; onClear: () => void }) {
  const isPending = !athlete;
  return (
    <div className="w-full h-12 flex items-center relative select-none">
      {/* Side Color bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-2.5 rounded-l-lg",
        isPending ? "bg-navy-950/15" : (color.includes('red') || color.includes('bg-red') ? "bg-red-600" : "bg-blue-600")
      )} />

      <div className="pl-4 pr-2 w-full flex flex-col justify-center">
        {athlete ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="min-w-0 flex-1">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-navy-950/40 block leading-none mb-0.5">
                {label}
              </span>
              <span className="font-extrabold text-navy-950 text-sm block truncate leading-tight">
                {athlete.name}
              </span>
              <span className="text-[9px] text-navy-950/40 font-bold block truncate leading-none mt-0.5">
                {athlete.affiliation}・{athlete.rank}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-navy-950/30 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all cursor-pointer shrink-0"
              title="選手を解除"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-navy-950/40 block leading-none mb-0.5">
              {label}
            </span>
            <span className="text-xs font-bold text-navy-950/35 block">
              ドラッグして選手を配置
            </span>
          </div>
        )}
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
