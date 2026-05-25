'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Award, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Athlete {
  id: string;
  name: string;
  rank: string;
  affiliation: string | null;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [ageDivision, setAgeDivision] = useState<'U12' | 'U14' | 'CADET' | 'JUNIOR' | 'U21' | 'SENIOR'>('SENIOR');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weightClass, setWeightClass] = useState('open');

  const [athletes, setAthletes] = useState<Athlete[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/athletes')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => setAthletes(d.athletes))
      .catch((err) => setError(err.message));
  }, []);

  const canSubmit = name.trim() !== '' && selected.size >= 2 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          date,
          ageDivision,
          gender,
          weightClass,
          athleteIds: [...selected],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const { id } = await res.json();
      router.push(`/tournaments/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 hover:text-navy-950 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back
        </Link>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">New Tournament</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basic Info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="NAME">
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold"
                placeholder="2026 春季空手選手権" />
            </Field>
            <Field label="DATE">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-mono font-black" />
            </Field>
          </div>
        </Section>

        <Section title="Category">
          <div className="grid grid-cols-3 gap-4">
            <Field label="AGE">
              <select value={ageDivision} onChange={(e) => setAgeDivision(e.target.value as typeof ageDivision)}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold bg-white">
                <option value="U12">U12</option>
                <option value="U14">U14</option>
                <option value="CADET">CADET</option>
                <option value="JUNIOR">JUNIOR</option>
                <option value="U21">U21</option>
                <option value="SENIOR">SENIOR</option>
              </select>
            </Field>
            <Field label="GENDER">
              <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold bg-white">
                <option value="male">男子</option>
                <option value="female">女子</option>
              </select>
            </Field>
            <Field label="WEIGHT">
              <input value={weightClass} onChange={(e) => setWeightClass(e.target.value)}
                className="w-full p-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold"
                placeholder="-75kg / open / etc" />
            </Field>
          </div>
        </Section>

        <Section title={`Participants  (${selected.size} selected)`}>
          {athletes === null && !error && (
            <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">Loading athletes...</p>
          )}
          {error && <p className="text-accent-red font-bold text-sm">{error}</p>}
          {athletes !== null && athletes.length === 0 && (
            <p className="text-navy-950/40 font-bold text-sm">
              選手が登録されていません。先に Supabase の athletes テーブルに seed を入れてください。
            </p>
          )}
          {athletes !== null && athletes.length > 0 && (
            <ul className="space-y-1 max-h-96 overflow-y-auto">
              {athletes.map((a) => {
                const isSelected = selected.has(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => toggle(a.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 border-2 rounded-xl transition-all',
                        isSelected
                          ? 'border-navy-950 bg-navy-950/5'
                          : 'border-navy-950/10 hover:border-navy-950/40',
                      )}
                    >
                      <div className="text-left min-w-0">
                        <p className="font-black text-sm truncate">{a.name}</p>
                        <p className="text-[10px] font-mono text-navy-950/40 truncate">
                          {a.rank}{a.affiliation && ` / ${a.affiliation}`}
                        </p>
                      </div>
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'bg-navy-950 border-navy-950' : 'border-navy-950/20',
                      )}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {error && <p className="text-accent-red font-bold text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-4 bg-navy-950 text-white font-black tracking-[0.2em] uppercase hover:bg-navy-900 active:scale-[0.98] transition-all disabled:opacity-20 rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Award size={18} />
          Create Tournament & Generate Bracket
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
      <span className="text-[10px] font-black tracking-[0.2em] text-navy-950/40 uppercase">{label}</span>
      {children}
    </label>
  );
}
