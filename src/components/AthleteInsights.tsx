import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Scatter 
} from 'recharts';
import { Athlete } from '../types';
import { 
  Brain, TrendingUp, AlertCircle, ShieldCheck, History, Calendar, 
  Target, Award, User, ArrowLeft, ArrowRight 
} from 'lucide-react';
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

interface AthleteInsightsProps {
  athlete: Athlete | null;
  onSelectAthlete: (athlete: Athlete | null) => void;
}

export default function AthleteInsights({ athlete, onSelectAthlete }: AthleteInsightsProps) {
  const [displayMode, setDisplayMode] = useState<'kana' | 'belt' | 'grade'>('kana');

  const getGojuonRow = (ath: Athlete): string => {
    const kana = ath.kana || '';
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

  const getBeltGroup = (ath: Athlete): string => {
    const rank = ath.rank;
    if (rank.includes('茶')) return '茶帯 (1級〜3級)';
    if (rank.includes('紫')) return '紫帯 (4級)';
    if (rank.includes('緑')) return '緑帯 (5級〜6級)';
    if (rank.includes('青') || rank.includes('水色')) return '青・水色帯 (7級〜8級)';
    if (rank.includes('黄')) return '黄帯 (9級〜10級)';
    return '白帯 (無級)';
  };

  // Group and sort athletes based on displayMode
  let groupedAthletes: { title: string; list: Athlete[] }[] = [];

  if (displayMode === 'kana') {
    const hiraganaRows = ['あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行', 'その他'];
    const groups: Record<string, Athlete[]> = {};
    hiraganaRows.forEach(row => { groups[row] = []; });
    
    MOCK_ATHLETES.forEach(ath => {
      const row = getGojuonRow(ath);
      groups[row].push(ath);
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
    
    MOCK_ATHLETES.forEach(ath => {
      const group = getBeltGroup(ath);
      groups[group].push(ath);
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
    
    MOCK_ATHLETES.forEach(ath => {
      const affiliation = ath.affiliation;
      if (groups[affiliation]) {
        groups[affiliation].push(ath);
      } else {
        if (!groups['その他']) groups['その他'] = [];
        groups['その他'].push(ath);
      }
    });
    
    gradeSequence.forEach(g => {
      groups[g].sort((a, b) => (a.kana || '').localeCompare(b.kana || '', 'ja'));
    });
    
    groupedAthletes = gradeSequence
      .map(g => ({ title: g, list: groups[g] }))
      .filter(g => g.list.length > 0);
  }

  // If no athlete is active, render the Grid Selector View (exactly like Match Selection)
  if (!athlete) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 text-white">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 block">Athlete Insights</span>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">選手データ分析アーカイブ</h2>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">
              分析したい選手を選択すると、レーダーチャートや試合展開のタイムライン、過去の実績が表示されます
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex bg-white text-black font-mono font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-white/10">
              登録選手数: {MOCK_ATHLETES.length}名
            </span>
          </div>
        </div>

        {/* Modern Sort / Grouping Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
          <div className="text-xs font-black text-neutral-300 uppercase tracking-widest pl-1">
             表示並び替え / Display Order
          </div>
          <div className="flex bg-black p-1 rounded-xl border border-neutral-800 w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => setDisplayMode('kana')}
              className={cn(
                "flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
                displayMode === 'kana' 
                  ? "bg-white text-black shadow shadow-white/10" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
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
                  ? "bg-white text-black shadow shadow-white/10" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
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
                  ? "bg-white text-black shadow shadow-white/10" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
              )}
            >
              学年順
            </button>
          </div>
        </div>

        {/* Grid count & Reset filters */}
        <div className="flex justify-between items-center text-xs">
          <span className="font-extrabold text-neutral-400 uppercase">
            選手一覧: {MOCK_ATHLETES.length}名
          </span>
        </div>

        {/* Scrollable Window for Athletes */}
        <div className="max-h-[500px] overflow-y-auto pr-3 border border-neutral-800 rounded-2xl p-4 bg-black shadow-inner">
          {groupedAthletes.length === 0 ? (
            <div className="border border-dashed border-neutral-800 py-16 text-center rounded-3xl bg-black">
              <p className="font-black tracking-wider text-sm text-neutral-500 uppercase">該当する選手が見つかりませんでした</p>
              <p className="text-xs text-neutral-600 font-semibold mt-1">別のキーワードやフィルターでお試しください</p>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-300 pb-12">
              {groupedAthletes.map((group) => (
                <div key={group.title} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex bg-white/10 text-white border border-white/20 font-black text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider leading-none shadow">
                      {group.title}
                    </span>
                    <div className="h-[2px] bg-neutral-800 flex-1" />
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{group.list.length}名</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.list.map((ath) => {
                      return (
                        <div 
                          key={ath.id}
                          onClick={() => onSelectAthlete(ath)}
                          className="border border-neutral-800 hover:border-white hover:shadow-lg hover:shadow-white/5 hover:scale-[1.02] bg-neutral-900/50 p-5 transition-all duration-200 cursor-pointer relative group rounded-2xl flex flex-col justify-between h-[170px]"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div className="p-1.5 bg-neutral-800 text-white rounded-lg shrink-0 flex items-center gap-1">
                                <User size={14} />
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-200 border border-neutral-700">
                                勝率: {ath.stats.winRate}%
                              </span>
                            </div>
                            <h3 className="font-black text-lg tracking-tight leading-tight mb-1 group-hover:text-white text-white transition-colors">{ath.name}</h3>
                            <p className="text-xs font-bold text-neutral-400 leading-tight">
                              {ath.affiliation}
                            </p>
                          </div>

                          {/* Rank and color dot */}
                          <div className="flex items-center justify-between border-t border-neutral-800 pt-3 mt-auto w-full relative">
                            <div className="absolute -top-[1px] -translate-y-full right-0 bg-neutral-800 border border-neutral-700 group-hover:border-white group-hover:bg-white text-neutral-400 group-hover:text-black px-2.5 py-1 text-[8px] font-black rounded-full transition-all uppercase tracking-widest flex items-center gap-1 z-10 shadow-sm">
                              <span>データ詳細</span>
                              <ArrowRight size={10} />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full ring-2 shrink-0 transition-all ring-neutral-800/50",
                                getBeltStyle(ath.rank).dot
                              )} />
                              <span className="text-[10px] font-bold tracking-wide text-neutral-300">
                                {ath.rank}
                              </span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] font-bold leading-none text-neutral-500">ATK {ath.stats.attack}</span>
                                <span className="text-[8px] font-bold leading-none mt-1 text-neutral-500">DEF {ath.stats.defense}</span>
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

  // Key-based state hook logic is managed inside a wrapper component or directly here
  return (
    <div key={athlete.id}>
      <AthleteInsightsDetail 
        athlete={athlete} 
        onBack={() => onSelectAthlete(null)} 
      />
    </div>
  );
}

// Sub-component for individual Detailed Reports so state resets completely on athlete toggle
function AthleteInsightsDetail({ athlete, onBack }: { athlete: Athlete; onBack: () => void }) {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  const radarData = [
    { subject: '攻撃力', A: athlete.stats.attack, fullMark: 100 },
    { subject: '守備力', A: athlete.stats.defense, fullMark: 100 },
    { subject: 'スピード', A: athlete.stats.speed, fullMark: 100 },
    { subject: 'スタミナ', A: athlete.stats.stamina, fullMark: 100 },
    { subject: '技術', A: 88, fullMark: 100 },
  ];

  const scoringTrend = [
    { time: '0:00', score: 0, opponentScore: 0 },
    { time: '0:45', score: 1, opponentScore: 0, event: 'Yuko (AO)', detail: '中段突き' },
    { time: '1:10', score: 1, opponentScore: 0, event: 'Penalty (AO)', detail: 'C1:場外' },
    { time: '1:30', score: 1, opponentScore: 2, event: 'Waza-ari (AKA)', detail: '相手の上段蹴り' },
    { time: '2:15', score: 3, opponentScore: 2, event: 'Waza-ari (AO)', detail: '中段蹴り' },
    { time: '2:40', score: 3, opponentScore: 2, event: 'Penalty (AO)', detail: 'C2:掴み' },
    { time: '2:50', score: 6, opponentScore: 2, event: 'Ippon (AO)', detail: '上段蹴り' },
    { time: '3:00', score: 6, opponentScore: 3, event: 'Yuko (AKA)', detail: '相手の中段突き' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-neutral-900 p-3 border border-neutral-800 shadow-xl text-white rounded-lg">
          <p className="text-[10px] font-mono text-neutral-400">{data.time}</p>
          <p className="text-xs font-black">{data.event || 'NO EVENT'}</p>
          {data.detail && <p className="text-[10px] text-red-400 font-bold mt-1 uppercase">{data.detail}</p>}
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-neutral-300">本人: {data.score} | 相手: {data.opponentScore}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  interface Insight {
    type: 'positive' | 'negative' | 'neutral';
    text: string;
    icon: React.ReactNode;
  }

  const insights: Insight[] = [
    { 
      type: 'positive', 
      text: '後半（3分以降）の得点率が80%を超えています。スタミナを活かした終盤の追い上げが強みです。', 
      icon: <TrendingUp size={16} /> 
    },
    { 
      type: 'neutral', 
      text: '突き（Tsuki）の成功率が高い一方、蹴り（Keri）のフェイントが読まれやすい傾向にあります。', 
      icon: <Brain size={16} /> 
    },
    { 
      type: 'negative', 
      text: 'カウンター攻撃を受けた際のガードの戻りが平均より0.2秒遅れています。防御面の強化が今後の課題です。', 
      icon: <AlertCircle size={16} /> 
    },
    { 
      type: 'positive', 
      text: 'C1/C2警告ゼロを3試合連続で継続中。非常にクリーンでマナーの良い競技姿勢です。', 
      icon: <ShieldCheck size={16} /> 
    },
  ];

  const timelineEvents = [
    { time: '0:45', type: 'point', label: 'YUKO', points: '+1', detail: '中段突き', isGain: true },
    { time: '1:10', type: 'penalty', label: 'C1', points: '警告', detail: '場外', isGain: false },
    { time: '1:30', type: 'point', label: 'WAZA-ARI', points: '-2', detail: '相手の上段蹴り', isGain: false },
    { time: '2:15', type: 'point', label: 'WAZA-ARI', points: '+2', detail: '中段蹴り', isGain: true },
    { time: '2:40', type: 'penalty', label: 'C2', points: '注意', detail: '掴み', isGain: false },
    { time: '2:50', type: 'point', label: 'IPPON', points: '+3', detail: '上段蹴り', isGain: true },
  ];

  return (
    <div className="p-8 space-y-10 bg-black text-white max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Back Button and Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-neutral-800 pb-6 gap-4">
        <div className="space-y-4">
          <button 
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-neutral-300 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 transition-all rounded-xl cursor-pointer border border-neutral-800"
          >
            <ArrowLeft size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
            選手一覧に戻る / Back to Athlete List
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-1 block">Athlete Analysis</span>
            <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white">{athlete.name}</h2>
            <p className="text-neutral-400 font-bold uppercase tracking-widest text-sm mt-1">
              {athlete.rank} | {athlete.affiliation} | RECORD: {athlete.stats.winRate}% WIN RATE
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end shrink-0">
          <div className="bg-white text-black px-4 py-1 text-[10px] font-black tracking-widest uppercase mb-1 shadow-lg shadow-white/10 rounded">ANALYSIS_CORE_V2</div>
          <span className="text-xs font-mono font-bold text-neutral-500">GENERATED UTC</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Match History Selector */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4 text-neutral-400">
            <History size={16} />
            MATCH HISTORY
          </h3>
          <div className="space-y-2">
            {athlete.history.length > 0 ? (
              athlete.history.map((match, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedMatchIndex(i)}
                  className={cn(
                    "w-full text-left p-4 border-2 transition-all group rounded-xl cursor-pointer",
                    selectedMatchIndex === i ? "border-white bg-white/10 text-white" : "border-neutral-800 bg-neutral-900/20 hover:border-neutral-700 text-neutral-300"
                  )}
                >
                  <div className="flex justify-between items-start mb-2 font-mono text-[10px] opacity-60">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {match.date}</span>
                    <span className={cn(match.result === 'Win' ? "text-green-400 font-extrabold" : "text-red-400 font-extrabold")}>{match.result}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold opacity-60 uppercase">{match.tournament}</p>
                      <p className="font-black text-sm uppercase tracking-tight">vs {match.opponentName}</p>
                    </div>
                    <div className="text-xl font-black font-mono">{match.score}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/10">
                <p className="text-[10px] font-bold text-neutral-500 uppercase">No History Data</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Analysis */}
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl">
               <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-neutral-300">
                  <span className="w-1.5 h-3 bg-white" />
                  能力パラメータ / Radar Chart
               </h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#262626" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#d4d4d4', fontSize: 10, fontWeight: 900 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={athlete.name}
                        dataKey="A"
                        stroke="#ffffff"
                        fill="#ffffff"
                        fillOpacity={0.15}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-neutral-300">
                  <Brain size={16} className="text-neutral-400" />
                  MATCH SPECIFIC ANALYSIS
                </h3>
                <div className="space-y-6">
                  {athlete.history[selectedMatchIndex] ? (
                    <>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 text-white">
                          <TrendingUp size={16} />
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-neutral-300">
                          対戦相手 <b>{athlete.history[selectedMatchIndex].opponentName}</b> との試合では、バランス良く得点機会を生み出せましたが、中盤でのフットワークとポジショニングが主導権を握る鍵となりました。
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700 text-neutral-200">
                          <Target size={16} />
                        </div>
                        <p className="text-xs font-medium leading-relaxed text-neutral-300">
                          最終スコア <b>{athlete.history[selectedMatchIndex].score}</b> が示す通り、攻撃の精度が高く、中段・上段の技術展開において優位に立つことができています。
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-neutral-500 italic">分析データ生成中...</p>
                  )}
                </div>
              </div>

              {/* General Insights */}
              <div className="mt-8 pt-6 border-t border-neutral-800 grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                <div>
                  <span className="block font-bold uppercase text-neutral-500">ATTACK RATING</span>
                  <span className="text-base font-black text-white">{athlete.stats.attack}/100</span>
                </div>
                <div>
                  <span className="block font-bold uppercase text-neutral-500">DEFENSE RATING</span>
                  <span className="text-base font-black text-white">{athlete.stats.defense}/100</span>
                </div>
              </div>
           </div>
          </div>

          {/* Combined AI Advice Bullets */}
          <div className="bg-neutral-900/30 border border-neutral-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-neutral-300">
              <Brain size={16} className="text-neutral-400" />
              アスリート個別分析 ＆ 戦術アドバイス
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/60">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center border",
                    ins.type === 'positive' && "bg-neutral-950 text-green-400 border-neutral-800",
                    ins.type === 'negative' && "bg-neutral-950 text-red-400 border-neutral-800",
                    ins.type === 'neutral' && "bg-neutral-950 text-yellow-400 border-neutral-800"
                  )}>
                    {ins.icon}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
                      {ins.type === 'positive' ? 'STRENGTH / 強み' : ins.type === 'negative' ? 'WEAKNESS / 改善点' : 'TACTICAL / 戦術'}
                    </span>
                    <p className="text-[11px] font-bold text-neutral-200 leading-relaxed">
                      {ins.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Chart Section */}
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-2xl">
             <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-neutral-300">
                <span className="w-1.5 h-3 bg-white" />
                得点分布タイムライン (対戦相手: {athlete.history[selectedMatchIndex]?.opponentName || '...'})
             </h3>
             <div className="h-80 mb-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoringTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="time" stroke="#404040" tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3' }} />
                    <YAxis stroke="#404040" tick={{ fontSize: 10, fontWeight: 700, fill: '#a3a3a3' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="rect" wrapperStyle={{ fontSize: 10, fontWeight: 900, paddingTop: 20, fill: '#d4d4d4' }} />
                    <Line 
                      name="本人 (AO)" 
                      type="stepAfter" 
                      dataKey="score" 
                      stroke="#ffffff" 
                      strokeWidth={4} 
                      dot={{ fill: '#ffffff', r: 6, strokeWidth: 2, stroke: '#000000' }} 
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      name="相手 (AKA)" 
                      type="stepAfter" 
                      dataKey="opponentScore" 
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={{ fill: '#ef4444', r: 4 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
               {timelineEvents.map((ev, i) => (
                 <div key={i} className={cn(
                   "border-l-4 p-3 bg-neutral-900 border border-neutral-800 shadow-sm flex justify-between items-center group transition-all hover:translate-x-1 rounded-r-xl",
                   ev.isGain ? "border-l-white" : "border-l-neutral-700"
                 )}>
                   <div>
                     <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", ev.isGain ? "bg-white" : "bg-neutral-700")} />
                       <span className="text-[10px] font-black font-mono text-neutral-500">{ev.time}</span>
                       <span className={cn("text-[10px] font-black", ev.isGain ? "text-white" : "text-neutral-400")}>{ev.label}</span>
                     </div>
                     <p className="text-[11px] font-bold mt-0.5 text-neutral-200">{ev.detail}</p>
                   </div>
                   <div className="text-right">
                     <span className={cn("text-xs font-black font-mono", ev.isGain ? "text-white" : "text-neutral-400")}>{ev.points}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
