'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Swords } from 'lucide-react';
import { createMatch } from '@/lib/scoring/actions';

export default function NewMatchPage() {
  const router = useRouter();
  const [akaName, setAkaName] = useState('');
  const [aoName, setAoName] = useState('');
  const [durationSec, setDurationSec] = useState(180);
  const [targetScore, setTargetScore] = useState(8);
  const [pointGap, setPointGap] = useState(8);
  const [senshuEnabled, setSenshuEnabled] = useState(true);
  const [tatamiNo, setTatamiNo] = useState<number | ''>('');
  const [round, setRound] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = akaName.trim() !== '' && aoName.trim() !== '' && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const id = await createMatch({
        akaName: akaName.trim(),
        aoName: aoName.trim(),
        round,
        tatamiNo: tatamiNo === '' ? null : tatamiNo,
        settings: { durationSec, targetScore, pointGap, senshuEnabled },
      });
      router.push(`/scoring/${id}`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href="/scoring"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 hover:text-navy-950 transition-colors mb-6"
        >
          <ArrowLeft size={12} /> Back to Matches
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">New Match</h1>
        <p className="text-navy-950/60 font-bold uppercase tracking-widest text-xs mt-2">
          ローカル試合を作成
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Athletes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="赤 (AKA) ATHLETE">
              <input
                value={akaName}
                onChange={(e) => setAkaName(e.target.value)}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold"
                placeholder="例: 田中太郎"
                required
              />
            </Field>
            <Field label="青 (AO) ATHLETE">
              <input
                value={aoName}
                onChange={(e) => setAoName(e.target.value)}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold"
                placeholder="例: 鈴木一郎"
                required
              />
            </Field>
          </div>
        </Section>

        <Section title="Match Settings">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="DURATION (SEC)">
              <input type="number" min={30} max={600} value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black" />
            </Field>
            <Field label="TARGET SCORE">
              <input type="number" min={1} max={30} value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black" />
            </Field>
            <Field label="POINT GAP">
              <input type="number" min={1} max={30} value={pointGap}
                onChange={(e) => setPointGap(Number(e.target.value))}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black" />
            </Field>
            <Field label="SENSHU">
              <label className="flex items-center gap-2 h-full p-3 border-2 border-navy-950/10 rounded-xl cursor-pointer">
                <input type="checkbox" checked={senshuEnabled}
                  onChange={(e) => setSenshuEnabled(e.target.checked)}
                  className="w-5 h-5" />
                <span className="font-black text-xs uppercase tracking-widest">Enabled</span>
              </label>
            </Field>
          </div>
        </Section>

        <Section title="Logistics (optional)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="ROUND">
              <input type="number" min={1} value={round}
                onChange={(e) => setRound(Number(e.target.value))}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black" />
            </Field>
            <Field label="TATAMI NO">
              <input type="number" min={1} value={tatamiNo}
                onChange={(e) => setTatamiNo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black"
                placeholder="--" />
            </Field>
          </div>
        </Section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-4 bg-navy-950 text-white font-black tracking-[0.2em] uppercase hover:bg-navy-900 active:scale-[0.98] transition-all disabled:opacity-20 rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Swords size={18} />
          Create Match
        </button>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border-2 border-navy-950/5 p-6 rounded-2xl space-y-4">
      <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
        <span className="w-1.5 h-3 bg-navy-950" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black tracking-[0.2em] text-navy-950/40 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
