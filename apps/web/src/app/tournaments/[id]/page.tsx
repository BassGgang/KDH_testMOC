'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Play, Trophy, Loader2 } from 'lucide-react';
import { importMatchFromBracket } from '@/lib/scoring/actions';
import { cn } from '@/lib/utils';

interface Slot {
  id: string;
  round: number;
  position: number;
  athlete_id: string | null;
  match_id: string | null;
  advances_to_slot_id: string | null;
}

interface DetailResponse {
  tournament: { id: string; name: string; date: string; status: string };
  categories: { id: string; age_division: string; gender: string; weight_class: string }[];
  bracket: { id: string; format: string; size: number } | null;
  slots: Slot[];
  athletes: { id: string; name: string; rank: string }[];
  matches: { id: string; status: string; winner_id: string | null }[];
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);  // pairKey being started

  useEffect(() => {
    fetch(`/api/tournaments/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <CenteredText>{error}</CenteredText>;
  if (!data) return <CenteredText>Loading...</CenteredText>;
  if (!data.bracket) return <CenteredText>Bracket not generated yet</CenteredText>;

  const athleteName = (athleteId: string | null) =>
    athleteId == null ? null : (data.athletes.find((a) => a.id === athleteId)?.name ?? '不明');
  const matchStatus = (matchId: string | null) =>
    matchId == null ? null : (data.matches.find((m) => m.id === matchId) ?? null);

  const rounds = [...new Set(data.slots.map((s) => s.round))].sort((a, b) => a - b);
  const cat = data.categories[0];

  async function handleStart(round: number, position: number, akaName: string, aoName: string, akaAthleteId: string, aoAthleteId: string) {
    const pairKey = `${round}-${position}`;
    setStarting(pairKey);
    try {
      const res = await fetch('/api/brackets/start-match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bracketId: data!.bracket!.id, round, position }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { matchId } = await res.json();
      await importMatchFromBracket({
        matchId,
        tournamentId: data!.tournament.id,
        categoryId: cat?.id ?? null,
        akaName, aoName,
        akaAthleteId, aoAthleteId,
        round,
      });
      router.push(`/scoring/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-navy-950 p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Link href="/tournaments" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-navy-950/40 hover:text-navy-950 transition-colors mb-4">
          <ArrowLeft size={12} /> Back to Tournaments
        </Link>
        <header className="border-b-2 border-navy-950 pb-6">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">{data.tournament.name}</h1>
          <p className="text-navy-950/60 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1"><Calendar size={12} /> {data.tournament.date}</span>
            {cat && <span>· {cat.age_division} / {cat.gender === 'male' ? '男子' : '女子'} / {cat.weight_class}</span>}
            <span>· {data.bracket.size} slots / single-elim</span>
          </p>
        </header>
      </div>

      <section className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-fit">
          {rounds.map((round) => {
            const slotsInRound = data.slots.filter((s) => s.round === round).sort((a, b) => a.position - b.position);
            const pairs: { lower: Slot; upper: Slot }[] = [];
            for (let i = 0; i + 1 < slotsInRound.length; i += 2) {
              pairs.push({ lower: slotsInRound[i]!, upper: slotsInRound[i + 1]! });
            }
            const isFinal = slotsInRound.length === 1;

            return (
              <div key={round} className="flex flex-col gap-3 min-w-[240px]">
                <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-navy-950/40">
                  {isFinal ? 'Champion' : `Round ${round}`}
                </h3>

                {isFinal ? (
                  <ChampionCard
                    name={athleteName(slotsInRound[0]!.athlete_id) ?? '— TBD —'}
                  />
                ) : (
                  pairs.map(({ lower, upper }) => {
                    const akaName = athleteName(lower.athlete_id) ?? '— TBD —';
                    const aoName  = athleteName(upper.athlete_id) ?? '— TBD —';
                    const ms = matchStatus(lower.match_id);
                    const pairKey = `${round}-${lower.position}`;
                    const canStart = lower.athlete_id != null && upper.athlete_id != null && (!ms || ms.status !== 'Completed');
                    const winnerSide =
                      ms?.winner_id == null ? null :
                      ms.winner_id === lower.athlete_id ? 'AKA' :
                      ms.winner_id === upper.athlete_id ? 'AO'  : null;

                    return (
                      <div key={pairKey} className={cn(
                        'border-2 rounded-2xl overflow-hidden bg-white shadow-sm',
                        ms?.status === 'Completed' ? 'border-navy-950' : 'border-navy-950/10',
                      )}>
                        <SlotRow color="red"  name={akaName} highlighted={winnerSide === 'AKA'} />
                        <SlotRow color="blue" name={aoName}  highlighted={winnerSide === 'AO'} />
                        <div className="p-2 border-t border-navy-950/10 bg-gray-50">
                          {ms?.status === 'Completed' ? (
                            <p className="text-[10px] font-black tracking-widest text-navy-950 uppercase text-center">
                              <Trophy size={12} className="inline mr-1" /> Decided
                            </p>
                          ) : canStart ? (
                            <button
                              onClick={() => handleStart(round, lower.position, akaName, aoName, lower.athlete_id!, upper.athlete_id!)}
                              disabled={starting === pairKey}
                              className="w-full flex items-center justify-center gap-2 bg-navy-950 text-white py-2 font-black text-[10px] tracking-widest uppercase rounded-lg hover:bg-navy-900 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {starting === pairKey
                                ? <><Loader2 size={12} className="animate-spin" /> Starting…</>
                                : ms ? <><Play size={12} /> Resume</> : <><Play size={12} /> Start</>}
                            </button>
                          ) : (
                            <p className="text-[10px] font-black tracking-widest text-navy-950/30 uppercase text-center">
                              Waiting
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="text-accent-red font-bold text-sm">{error}</p>}
    </main>
  );
}

function SlotRow({ color, name, highlighted }: { color: 'red' | 'blue'; name: string; highlighted: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2',
      highlighted && 'bg-yellow-50',
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        color === 'red' ? 'bg-red-600' : 'bg-blue-600',
      )} />
      <span className={cn(
        'font-black text-sm truncate flex-1',
        name.startsWith('—') && 'text-navy-950/30 italic',
      )}>
        {name}
      </span>
      {highlighted && <Trophy size={14} className="text-yellow-600 shrink-0" />}
    </div>
  );
}

function ChampionCard({ name }: { name: string }) {
  return (
    <div className="border-2 border-yellow-400 bg-yellow-50 rounded-2xl p-4 text-center shadow-lg">
      <Trophy size={24} className="text-yellow-600 mx-auto mb-2" />
      <p className="text-[10px] font-black tracking-widest uppercase text-navy-950/60 mb-1">Champion</p>
      <p className="font-black text-base tracking-tight">{name}</p>
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
