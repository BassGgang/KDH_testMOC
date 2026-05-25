import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-navy-950 p-10 flex flex-col items-center justify-center bg-[radial-gradient(#020617_0.5px,transparent_0.5px)] [background-size:24px_24px]">
      <div className="max-w-2xl w-full bg-white border-2 border-navy-950 p-10 shadow-[12px_12px_0px_0px_rgba(2,6,23,1)] space-y-8">
        <header className="space-y-2 border-b-2 border-navy-950 pb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 block">
            Phase 00: Workspace Bootstrapped
          </span>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">
            Karate System
          </h1>
          <p className="text-navy-950/60 font-bold uppercase tracking-widest text-sm">
            Scoring &amp; Athlete Analytics
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-sm font-medium leading-relaxed">
            モノレポのセットアップが完了しました。Step 1 完了です。
          </p>
          <ul className="text-xs font-mono space-y-1 text-navy-950/70">
            <li>・apps/web (Next.js)</li>
            <li>・packages/ui (デザイントークン)</li>
            <li>・packages/domain (採点ルール: 未実装)</li>
            <li>・packages/schemas (API契約: 未実装)</li>
            <li>・packages/db (Supabaseクライアント)</li>
          </ul>
        </section>

        <nav className="grid grid-cols-3 gap-3">
          <Link
            href="/scoring"
            className="block p-4 bg-navy-950 text-white font-black uppercase tracking-widest text-xs hover:bg-navy-900 transition-colors text-center"
          >
            Scoring →
          </Link>
          <Link
            href="/tournaments"
            className="block p-4 bg-navy-950 text-white font-black uppercase tracking-widest text-xs hover:bg-navy-900 transition-colors text-center"
          >
            Tournaments →
          </Link>
          <Link
            href="/viewer"
            className="block p-4 border-2 border-navy-950 text-navy-950 font-black uppercase tracking-widest text-xs hover:bg-navy-950 hover:text-white transition-colors text-center"
          >
            Viewer →
          </Link>
        </nav>
      </div>
    </main>
  );
}
