import { describe, expect, it } from 'vitest';
import { AthleteResponseSchema, AthleteStatsSchema } from '../src/athlete';

const ATHLETE_ID = '01931a4f-1234-7890-abcd-ef1234567890';

describe('AthleteStatsSchema', () => {
  it('accepts stats with values in [0,100]', () => {
    const r = AthleteStatsSchema.safeParse({
      attack: 75, defense: 60, speed: 88, stamina: 70, winRate: 55, matchCount: 12,
    });
    expect(r.success).toBe(true);
  });

  it('rejects stats > 100', () => {
    const r = AthleteStatsSchema.safeParse({
      attack: 150, defense: 60, speed: 88, stamina: 70, winRate: 55, matchCount: 12,
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative matchCount', () => {
    const r = AthleteStatsSchema.safeParse({
      attack: 75, defense: 60, speed: 88, stamina: 70, winRate: 55, matchCount: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe('AthleteResponseSchema', () => {
  it('accepts a full athlete record with stats', () => {
    const r = AthleteResponseSchema.safeParse({
      id: ATHLETE_ID,
      name: '田中太郎',
      rank: 'Black',
      affiliation: '横浜空手クラブ',
      birthDate: '2000-04-12',
      gender: 'male',
      weightKg: 72.5,
      stats: {
        attack: 75, defense: 60, speed: 88, stamina: 70, winRate: 55, matchCount: 12,
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty('birthDate');
      expect(r.data).not.toHaveProperty('gender');
      expect(r.data).not.toHaveProperty('weightKg');
    }
  });

  it('accepts an athlete with no stats yet', () => {
    const r = AthleteResponseSchema.safeParse({
      id: ATHLETE_ID,
      name: '新人選手',
      rank: 'White',
      affiliation: null,
      birthDate: null,
      gender: null,
      weightKg: null,
      stats: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = AthleteResponseSchema.safeParse({
      id: ATHLETE_ID,
      name: '',
      rank: 'White',
      affiliation: null,
      birthDate: null,
      gender: null,
      weightKg: null,
      stats: null,
    });
    expect(r.success).toBe(false);
  });
});
