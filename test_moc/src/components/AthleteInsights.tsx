import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Scatter 
} from 'recharts';
import { Athlete } from '../types';
import { Brain, TrendingUp, AlertCircle, ShieldCheck, History, Calendar, Target, Award } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AthleteInsights({ athlete }: { athlete: Athlete }) {
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

  // For markers on the chart
  const scatterData = scoringTrend.filter(d => d.event).map(d => ({
    time: d.time,
    score: d.score,
    event: d.event,
    detail: d.detail
  }));

  const timelineEvents = [
    { time: '0:45', type: 'point', label: 'YUKO', points: '+1', detail: '中段突き', isGain: true },
    { time: '1:10', type: 'penalty', label: 'C1', points: '警告', detail: '場外', isGain: false },
    { time: '1:30', type: 'point', label: 'WAZA-ARI', points: '-2', detail: '相手の上段蹴り', isGain: false },
    { time: '2:15', type: 'point', label: 'WAZA-ARI', points: '+2', detail: '中段蹴り', isGain: true },
    { time: '2:40', type: 'penalty', label: 'C2', points: '注意', detail: '掴み', isGain: false },
    { time: '2:50', type: 'point', label: 'IPPON', points: '+3', detail: '上段蹴り', isGain: true },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-navy-950 p-3 border border-white/20 shadow-xl">
          <p className="text-[10px] font-mono text-white/40">{data.time}</p>
          <p className="text-xs font-black text-white">{data.event || 'NO EVENT'}</p>
          {data.detail && <p className="text-[10px] text-accent-red font-bold mt-1 uppercase">{data.detail}</p>}
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-white/60">AO: {data.score} | AKA: {data.opponentScore}</p>
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
      text: 'カウンター攻撃を受けた際のガードの戻りが平均より0.2秒遅れています。防御面の強化がNexTepです。', 
      icon: <AlertCircle size={16} /> 
    },
    { 
      type: 'positive', 
      text: 'C1/C2警告ゼロを3試合連続で継続中。非常にクリーンでマナーの良い競技姿勢です。', 
      icon: <ShieldCheck size={16} /> 
    },
  ];

  return (
    <div className="p-8 space-y-10 bg-white text-navy-950 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 pb-6 border-navy-950">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/30 mb-2 block">Phase 03: Performance Insights</span>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic">{athlete.name}</h2>
          <p className="text-navy-950/60 font-bold uppercase tracking-widest text-sm mt-1">
            {athlete.rank} | {athlete.affiliation} | RECORD: {athlete.stats.winRate}% WIN RATE
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="bg-navy-950 text-white px-4 py-1 text-[10px] font-black tracking-widest uppercase mb-2">ANALYSIS_CORE_V2</div>
          <span className="text-xs font-mono font-bold text-navy-950/40">GEN_TIMESTAMP: 2026.04.19.02:15</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Match History Selector */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <History size={16} />
            MATCH HISTORY
          </h3>
          <div className="space-y-2">
            {athlete.history.length > 0 ? (
              athlete.history.map((match, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMatchIndex(i)}
                  className={cn(
                    "w-full text-left p-4 border-2 transition-all group",
                    selectedMatchIndex === i ? "border-navy-950 bg-navy-950 text-white" : "border-navy-950/5 hover:border-navy-950/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-2 font-mono text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {match.date}</span>
                    <span className={cn(match.result === 'Win' ? "text-green-500" : "text-accent-red")}>{match.result}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold opacity-50 uppercase">{match.tournament}</p>
                      <p className="font-black text-sm uppercase tracking-tight">vs {match.opponentName}</p>
                    </div>
                    <div className="text-xl font-black font-mono">{match.score}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-navy-950/10">
                <p className="text-[10px] font-bold text-navy-950/30 uppercase">No History Data</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Analysis */}
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-navy-950/5 p-6">
               <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-navy-950" />
                  能力デプロイメント
               </h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#010816', fontSize: 10, fontWeight: 900 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={athlete.name}
                        dataKey="A"
                        stroke="#020617"
                        fill="#020617"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-navy-950 text-white p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Brain size={16} className="text-accent-red" />
                MATCH SPECIFIC ANALYSIS
              </h3>
              <div className="space-y-6">
                {athlete.history[selectedMatchIndex] ? (
                  <>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 text-accent-red">
                        <TrendingUp size={16} />
                      </div>
                      <p className="text-xs font-medium leading-relaxed opacity-80">
                        対戦相手 <b>{athlete.history[selectedMatchIndex].opponentName}</b> との試合では、序盤の有効打により有利な展開を作れましたが、中盤でのC1警告からリズムを崩す傾向が見られました。
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 text-white">
                        <Target size={16} />
                      </div>
                      <p className="text-xs font-medium leading-relaxed opacity-80">
                        最終スコア <b>{athlete.history[selectedMatchIndex].score}</b> が示す通り、攻撃の決定力は高いですが、相打ちの場面でのポイント奪取率に課題が残ります。
                      </p>
                    </div>
                  </>
                ) : (
                   <p className="text-xs font-bold text-white/40 italic">分析データ生成中...</p>
                )}
              </div>
           </div>
          </div>

          {/* Enhanced Chart Section */}
          <div className="bg-gray-50 border border-navy-950/5 p-6">
             <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-navy-950" />
                試合展開タイムライン (対戦相手: {athlete.history[selectedMatchIndex]?.opponentName || '...'})
             </h3>
             <div className="h-80 mb-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoringTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="rect" wrapperStyle={{ fontSize: 10, fontWeight: 900, paddingTop: 20 }} />
                    <Line 
                      name="本人 (AO)" 
                      type="stepAfter" 
                      dataKey="score" 
                      stroke="#020617" 
                      strokeWidth={4} 
                      dot={{ fill: '#020617', r: 6, strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      name="相手 (AKA)" 
                      type="stepAfter" 
                      dataKey="opponentScore" 
                      stroke="#B91C1C" 
                      strokeWidth={2} 
                      strokeDasharray="5 5" 
                      dot={{ fill: '#B91C1C', r: 4 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] scrollbar-hide">
               {timelineEvents.map((ev, i) => (
                 <div key={i} className={cn(
                   "border-l-4 p-3 bg-white shadow-sm flex justify-between items-center group transition-all hover:translate-x-1",
                   ev.isGain ? "border-navy-950" : "border-accent-red"
                 )}>
                   <div>
                     <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", ev.isGain ? "bg-navy-950" : "bg-accent-red")} />
                       <span className="text-[10px] font-black font-mono opacity-30">{ev.time}</span>
                       <span className={cn("text-[10px] font-black", ev.isGain ? "text-navy-950" : "text-accent-red")}>{ev.label}</span>
                     </div>
                     <p className="text-[11px] font-bold mt-0.5">{ev.detail}</p>
                   </div>
                   <div className="text-right">
                     <span className={cn("text-xs font-black font-mono", ev.isGain ? "text-navy-950" : "text-accent-red")}>{ev.points}</span>
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
