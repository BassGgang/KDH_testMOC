'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Athlete {
  id: string;
  name: string;
  rank: string;
  affiliation: string | null;
}

export default function ViewerPage() {
  const [athletes, setAthletes] = useState<Athlete[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/athletes')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { if (!cancelled) setAthletes(data.athletes); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const filtered = (athletes ?? []).filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    (a.affiliation?.toLowerCase().includes(query.toLowerCase()) ?? false),
  );

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-3xl mx-auto space-y-6">
      <header className="border-b-2 border-navy-950 pb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 mb-2 block">
          Viewer / Athletes
        </span>
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Athletes</h1>
        <p className="text-navy-950/60 font-bold uppercase tracking-widest text-xs mt-2">
          選手データ閲覧
        </p>
      </header>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-950/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前 or 所属で検索"
          className="w-full pl-11 pr-4 py-3 border-2 border-navy-950/10 focus:border-navy-950 focus:outline-none rounded-xl font-bold"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-accent-red text-sm font-bold">
          {error}
        </div>
      )}

      {athletes === null && !error ? (
        <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={query !== ''} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link
                href={`/viewer/athletes/${a.id}`}
                className="flex items-center justify-between p-4 border-2 border-navy-950/10 hover:border-navy-950 transition-colors rounded-2xl bg-white shadow-sm group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar name={a.name} />
                  <div className="min-w-0">
                    <p className="font-black text-base tracking-tight truncate">{a.name}</p>
                    <p className="text-[10px] font-mono text-navy-950/40 truncate">
                      {a.rank}
                      {a.affiliation && ` / ${a.affiliation}`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-navy-950/30 group-hover:text-navy-950 transition-colors shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="w-10 h-10 bg-navy-950 text-white flex items-center justify-center rounded-xl font-black text-lg shrink-0">
      {initial}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className={cn(
      'text-center py-16 border-2 border-dashed border-navy-950/10 rounded-3xl',
    )}>
      <div className="mx-auto w-14 h-14 bg-navy-950/5 flex items-center justify-center rounded-2xl mb-4">
        <Users size={24} className="text-navy-950/30" />
      </div>
      <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">
        {hasQuery ? 'No athletes match your search.' : 'No athletes registered yet.'}
      </p>
    </div>
  );
}
