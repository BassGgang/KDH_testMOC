'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Swords, Trophy, Clock, ChevronRight } from 'lucide-react';
import { getDB } from '@/lib/db/dexie';
import { cn } from '@/lib/utils';
import { SyncStatus } from '@/components/SyncStatus';

export default function ScoringListPage() {
  const matches = useLiveQuery(
    () => getDB().matches.orderBy('createdAt').reverse().toArray(),
    [],
  );

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex items-end justify-between border-b-2 border-navy-950 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 mb-2 block">
            Scoring App / Local Matches
          </span>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">
            Matches
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus />
          <Link
            href="/scoring/new"
            className="flex items-center gap-2 bg-navy-950 text-white px-5 py-3 font-black uppercase tracking-widest text-sm hover:bg-navy-900 transition-colors rounded-xl shadow-lg active:scale-95"
          >
            <Plus size={18} />
            New Match
          </Link>
        </div>
      </header>

      {matches === undefined ? (
        <div className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">Loading...</div>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/scoring/${m.id}`}
                className="flex items-center justify-between p-5 border-2 border-navy-950/10 hover:border-navy-950 transition-all group rounded-2xl bg-white shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <StatusBadge status={m.status} />
                  <div>
                    <p className="font-black text-lg tracking-tight">
                      {m.akaName}
                      <span className="text-navy-950/30 font-mono text-sm mx-3">vs</span>
                      {m.aoName}
                    </p>
                    <p className="text-[10px] font-mono text-navy-950/40 mt-1">
                      Round {m.round}
                      {m.tatamiNo != null && ` / Tatami ${m.tatamiNo}`}
                      {' / '}
                      {new Date(m.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-navy-950/30 group-hover:text-navy-950 transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: 'in_progress' | 'finished' | 'synced' }) {
  const map = {
    in_progress: { Icon: Clock,  label: 'IN PROGRESS', cls: 'bg-yellow-50  text-yellow-700 border-yellow-200' },
    finished:    { Icon: Trophy, label: 'FINISHED',    cls: 'bg-navy-950/5 text-navy-950   border-navy-950/20' },
    synced:      { Icon: Swords, label: 'SYNCED',      cls: 'bg-green-50   text-green-700  border-green-200' },
  } as const;
  const { Icon, label, cls } = map[status];
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border rounded-xl font-black text-[10px] tracking-widest uppercase', cls)}>
      <Icon size={14} />
      {label}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border-2 border-dashed border-navy-950/10 rounded-3xl">
      <div className="mx-auto w-16 h-16 bg-navy-950/5 flex items-center justify-center rounded-2xl mb-4">
        <Swords size={28} className="text-navy-950/30" />
      </div>
      <p className="text-navy-950/40 font-bold uppercase tracking-widest text-xs">
        No matches yet. Create one to start scoring.
      </p>
    </div>
  );
}
