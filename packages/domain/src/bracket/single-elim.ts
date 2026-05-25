/**
 * Single-elimination bracket generation.
 *
 * Slot layout (size = 4 example):
 *   Round 1: positions [0, 1, 2, 3]   ← athletes start here
 *   Round 2: positions [0, 1]         ← winners of (R1, 0)+(R1, 1) and (R1, 2)+(R1, 3)
 *   Round 3: position  [0]            ← champion
 *
 * Each slot in round R points to its parent slot at round R+1 via
 * `advancesToPosition` so the renderer can draw the tree.
 *
 * For MVP we do sequential seeding (athlete[0] vs athlete[1], etc.). BYEs are
 * represented as null athleteId entries when the participant count is not a
 * power of two.
 */

export interface GeneratedSlot {
  round: number;                       // 1-indexed: 1 is the first round
  position: number;                    // 0-indexed within the round
  athleteId: string | null;            // populated for round 1; null elsewhere or for BYE
  advancesToPosition: number | null;   // index within the next round (R+1); null for the champion slot
}

export interface GeneratedBracket {
  size: number;                        // number of slots in round 1 (always a power of two)
  totalRounds: number;
  slots: GeneratedSlot[];
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function generateSingleElimBracket(athleteIds: (string | null)[]): GeneratedBracket {
  if (athleteIds.length < 2) {
    throw new Error('At least 2 athletes are required to build a bracket');
  }
  const size = nextPowerOfTwo(athleteIds.length);
  const totalRounds = Math.log2(size) + 1;
  const slots: GeneratedSlot[] = [];

  // Round 1: place athletes; pad with BYEs (null) up to size.
  for (let i = 0; i < size; i++) {
    slots.push({
      round: 1,
      position: i,
      athleteId: athleteIds[i] ?? null,
      advancesToPosition: Math.floor(i / 2),
    });
  }

  // Subsequent rounds: empty slots that winners will advance into.
  let participants = size / 2;
  let round = 2;
  while (participants >= 1) {
    for (let p = 0; p < participants; p++) {
      slots.push({
        round,
        position: p,
        athleteId: null,
        advancesToPosition: participants === 1 ? null : Math.floor(p / 2),
      });
    }
    participants = participants / 2;
    round += 1;
  }

  return { size, totalRounds, slots };
}

/**
 * Group round-1 slots into pairs that form a single match.
 * Returns [[slot(1,0), slot(1,1)], [slot(1,2), slot(1,3)], ...].
 *
 * For higher rounds, pair by adjacent positions in the same round.
 */
export function pairSlotsForRound(slots: GeneratedSlot[], round: number): [GeneratedSlot, GeneratedSlot][] {
  const inRound = slots.filter((s) => s.round === round).sort((a, b) => a.position - b.position);
  const pairs: [GeneratedSlot, GeneratedSlot][] = [];
  for (let i = 0; i + 1 < inRound.length; i += 2) {
    pairs.push([inRound[i]!, inRound[i + 1]!]);
  }
  return pairs;
}
