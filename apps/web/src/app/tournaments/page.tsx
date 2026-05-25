'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, ChevronRight, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: 'Draft' | 'Ongoing' | 'Completed';
  created_at: string;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tournaments')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d) => setTournaments(d.tournaments))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-end justify-between border-b-2 border-navy-950 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 mb-2 block">
            Tournaments
          </span>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Tournaments</h1>
        </div>
        <Link
          href="/tournaments/new"
          className="flex items-center gap-2 bg-navy-950 text-white px-5 py-3 font-black uppercase tracking-widest text-sm hover:bg-navy-900 transition-colors rounded-xl shadow-lg active:scale-95"
        >
          <Plus size={18} />
          New
        </Link>
      </header>

      {error && <p className="text-accent-red font-bold text-sm">{error}</p>}

      {tournaments === null && !error ? (
        <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">Loading...</p>
      ) : (tournaments ?? []).length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {tournaments!.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between p-4 border-2 border-navy-950/10 hover:border-navy-950 transition-colors rounded-2xl bg-white shadow-sm group"
              >
                <div className="min-w-0">
                  <p className="font-black text-base tracking-tight truncate">{t.name}</p>
                  <p className="text-[10px] font-mono text-navy-950/40 flex items-center gap-1 mt-1">
                    <Calendar size={10} /> {t.date}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={t.status} />
                  <ChevronRight size={18} className="text-navy-950/30 group-hover:text-navy-950 transition-colors" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: 'Draft' | 'Ongoing' | 'Completed' }) {
  const map = {
    Draft:     'bg-gray-50 text-navy-950/60 border-gray-200',
    Ongoing:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    Completed: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={cn('px-2 py-1 border rounded-md text-[10px] font-black tracking-widest uppercase', map[status])}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 border-2 border-dashed border-navy-950/10 rounded-3xl">
      <div className="mx-auto w-14 h-14 bg-navy-950/5 flex items-center justify-center rounded-2xl mb-4">
        <Award size={24} className="text-navy-950/30" />
      </div>
      <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">
        No tournaments yet.
      </p>
    </div>
  );
}
