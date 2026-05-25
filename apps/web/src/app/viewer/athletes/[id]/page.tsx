'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Award, TrendingUp, History, Calendar,
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface HistoryItem {
  matchId: string;
  date: string | null;
  round: number;
  isWin: boolean;
  ownScore: number;
  opponentScore: number;
  opponentName: string;
}

interface AthleteResponse {
  id: string;
  name: string;
  rank: string;
  affiliation: string | null;
  gender: 'male' | 'female' | null;
  weightKg: number | null;
  birthDate: string | null;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    stamina: number;
    winRate: number;
    matchCount: number;
  };
  history: HistoryItem[];
}

export default function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AthleteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/athletes/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(String(err.message)); });
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <CenteredText>{error}</CenteredText>;
  if (!data) return <CenteredText>Loading...</CenteredText>;

  const radarData = [
    { subject: '攻撃力', value: data.stats.attack },
    { subject: '守備力', value: data.stats.defense },
    { subject: 'スピード', value: data.stats.speed },
    { subject: 'スタミナ', value: data.stats.stamina },
    { subject: '勝率', value: data.stats.winRate },
  ];

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <Link
          href="/viewer"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 hover:text-navy-950 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back to Athletes
        </Link>
        <header className="border-b-2 border-navy-950 pb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/30 mb-2 block">
            Phase 03: Performance Insights
          </span>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">{data.name}</h1>
          <p className="text-navy-950/60 font-bold uppercase tracking-widest text-sm mt-2">
            {data.rank}
            {data.weightKg != null && ` / ${data.weightKg}kg`}
            {data.affiliation && ` / ${data.affiliation}`}
            {' / '} {data.stats.matchCount} MATCHES · {data.stats.winRate}% WIN RATE
          </p>
        </header>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar chart */}
        <section className="bg-gray-50 border border-navy-950/5 p-6 rounded-2xl">
          <h2 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-navy-950" />
            能力プロファイル
            <span className="text-[9px] text-navy-950/30 font-mono ml-auto">PROVISIONAL</span>
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#020617', fontSize: 11, fontWeight: 900 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={data.name} dataKey="value" stroke="#020617" fill="#020617" fillOpacity={0.55} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Stat boxes */}
        <section className="grid grid-cols-2 gap-3">
          <StatBox label="攻撃力"   value={data.stats.attack}  Icon={TrendingUp} />
          <StatBox label="守備力"   value={data.stats.defense} Icon={Award} />
          <StatBox label="スピード" value={data.stats.speed}   Icon={TrendingUp} />
          <StatBox label="スタミナ" value={data.stats.stamina} Icon={Award} />
        </section>
      </div>

      {/* Match history */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
          <History size={14} />
          Match History
        </h2>
        {data.history.length === 0 ? (
          <EmptyHistory />
        ) : (
          <ul className="space-y-2">
            {data.history.map((h) => (
              <li key={h.matchId} className="border-2 border-navy-950/5 p-4 rounded-xl bg-white flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase',
                    h.isWin ? 'bg-green-100 text-green-700' : 'bg-red-100 text-accent-red',
                  )}>
                    {h.isWin ? 'WIN' : 'LOSS'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm tracking-tight truncate">vs {h.opponentName}</p>
                    <p className="text-[10px] font-mono text-navy-950/40 flex items-center gap-1">
                      <Calendar size={10} />
                      {h.date ? new Date(h.date).toLocaleString('ja-JP') : '—'}
                      {' · R'}{h.round}
                    </p>
                  </div>
                </div>
                <div className="font-mono font-black text-xl shrink-0">
                  {h.ownScore}<span className="text-navy-950/30 mx-1">-</span>{h.opponentScore}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatBox({ label, value, Icon }: { label: string; value: number; Icon: typeof TrendingUp }) {
  return (
    <div className="bg-white border-2 border-navy-950/5 p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black tracking-widest uppercase text-navy-950/40">{label}</span>
        <Icon size={14} className="text-navy-950/30" />
      </div>
      <p className="text-3xl font-mono font-black">{value}</p>
      <div className="mt-2 h-1.5 bg-navy-950/5 rounded-full overflow-hidden">
        <div className="h-full bg-navy-950" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="text-center py-10 border-2 border-dashed border-navy-950/10 rounded-2xl">
      <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">
        まだ試合データがありません
      </p>
    </div>
  );
}

function CenteredText({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center text-navy-950/40 font-bold uppercase tracking-widest text-xs p-6 text-center">
      {children}
    </main>
  );
}
