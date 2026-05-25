import { describe, expect, it } from 'vitest';
import {
  generateSingleElimBracket, nextPowerOfTwo, pairSlotsForRound,
} from '../src/bracket/single-elim';

describe('nextPowerOfTwo', () => {
  it.each([
    [1, 1], [2, 2], [3, 4], [4, 4], [5, 8], [8, 8], [9, 16], [16, 16], [17, 32],
  ])('nextPowerOfTwo(%i) = %i', (input, expected) => {
    expect(nextPowerOfTwo(input)).toBe(expected);
  });
});

describe('generateSingleElimBracket', () => {
  it('throws if fewer than 2 athletes', () => {
    expect(() => generateSingleElimBracket(['a'])).toThrow();
    expect(() => generateSingleElimBracket([])).toThrow();
  });

  it('size 2: one round, two slots + a final slot', () => {
    const b = generateSingleElimBracket(['a', 'b']);
    expect(b.size).toBe(2);
    expect(b.totalRounds).toBe(2);
    expect(b.slots).toHaveLength(3);
    expect(b.slots.filter((s) => s.round === 1)).toHaveLength(2);
    expect(b.slots.filter((s) => s.round === 2)).toHaveLength(1);
    const champion = b.slots.find((s) => s.round === 2 && s.position === 0)!;
    expect(champion.advancesToPosition).toBeNull();
  });

  it('size 4: round 1 = 4 slots, round 2 = 2 slots, round 3 = 1 slot', () => {
    const b = generateSingleElimBracket(['a', 'b', 'c', 'd']);
    expect(b.size).toBe(4);
    expect(b.totalRounds).toBe(3);
    expect(b.slots.filter((s) => s.round === 1)).toHaveLength(4);
    expect(b.slots.filter((s) => s.round === 2)).toHaveLength(2);
    expect(b.slots.filter((s) => s.round === 3)).toHaveLength(1);
  });

  it('pads with BYEs to next power of two', () => {
    const b = generateSingleElimBracket(['a', 'b', 'c']);
    expect(b.size).toBe(4);
    const r1 = b.slots.filter((s) => s.round === 1).sort((a, b) => a.position - b.position);
    expect(r1.map((s) => s.athleteId)).toEqual(['a', 'b', 'c', null]);
  });

  it('round 1 slots advance to correct round-2 position', () => {
    const b = generateSingleElimBracket(['a', 'b', 'c', 'd']);
    const r1 = b.slots.filter((s) => s.round === 1).sort((a, b) => a.position - b.position);
    expect(r1[0]!.advancesToPosition).toBe(0);
    expect(r1[1]!.advancesToPosition).toBe(0);
    expect(r1[2]!.advancesToPosition).toBe(1);
    expect(r1[3]!.advancesToPosition).toBe(1);
  });
});

describe('pairSlotsForRound', () => {
  it('groups round 1 slots in adjacent pairs', () => {
    const b = generateSingleElimBracket(['a', 'b', 'c', 'd']);
    const pairs = pairSlotsForRound(b.slots, 1);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.map((s) => s.athleteId)).toEqual(['a', 'b']);
    expect(pairs[1]!.map((s) => s.athleteId)).toEqual(['c', 'd']);
  });
});
