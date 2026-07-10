import Link from 'next/link';
import { MonitorPlay, BarChart3, Trophy } from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';

const CARDS = [
  {
    href: '/scoring',
    title: '試合', en: 'Match Scoring',
    desc: 'タタミごとのライブ採点。オフライン対応。',
    Icon: MonitorPlay,
    hover: 'group-hover:text-red-600',
  },
  {
    href: '/tournaments',
    title: '大会', en: 'Tournament',
    desc: 'ブラケット作成から試合開始までを管理。',
    Icon: Trophy,
    hover: 'group-hover:text-yellow-500',
  },
  {
    href: '/viewer',
    title: '分析', en: 'Athlete Insights',
    desc: '選手の戦績とパフォーマンス分析。',
    Icon: BarChart3,
    hover: 'group-hover:text-blue-600',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-navy-950 flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-navy-950/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-navy-950 text-white rounded-xl flex items-center justify-center font-black italic tracking-tighter">
            NX
          </div>
          <span className="font-black italic uppercase tracking-tighter text-sm">NexTep</span>
        </div>
        <SignOutButton />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">
            空手デジタルスコアリング
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-navy-950/40">
            Karate DX · Live Scoring &amp; Analytics
          </p>
        </div>

        <nav className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {CARDS.map(({ href, title, en, desc, Icon, hover }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white border border-navy-950/10 rounded-[2rem] p-8 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
            >
              <Icon size={40} strokeWidth={1.5} className={`text-navy-950/80 transition-colors ${hover}`} />
              <div className="flex-1">
                <h2 className="text-2xl font-black tracking-tighter">{title}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy-950/40 mt-0.5">{en}</p>
                <p className="text-sm text-navy-950/60 font-medium mt-3 leading-relaxed">{desc}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-navy-950/50 group-hover:text-navy-950 transition-colors">
                開く
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <footer className="text-center pb-8 text-[9px] font-black uppercase tracking-[0.2em] text-navy-950/30">
        NexTep Karate DX · Internal Operations
      </footer>
    </main>
  );
}
