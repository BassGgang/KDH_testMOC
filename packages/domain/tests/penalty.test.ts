import { describe, expect, it } from 'vitest';
import { evaluatePenalty } from '../src/scoring/penalty';

function detail(c1: number, c2: number) {
  return { ippon: 0, wazaAri: 0, yuko: 0, c1, c2 };
}

describe('evaluatePenalty', () => {
  it('returns none for 0 penalties', () => {
    expect(evaluatePenalty(detail(0, 0))).toEqual({
      c1Status: 'none',
      c2Status: 'none',
      isHansoku: false,
    });
  });

  it('1st C1 = chukoku', () => {
    expect(evaluatePenalty(detail(1, 0)).c1Status).toBe('chukoku');
  });

  it('2nd C1 = keikoku', () => {
    expect(evaluatePenalty(detail(2, 0)).c1Status).toBe('keikoku');
  });

  it('3rd C1 = hansoku_chui', () => {
    expect(evaluatePenalty(detail(3, 0)).c1Status).toBe('hansoku_chui');
  });

  it('4th C1 = hansoku and isHansoku true', () => {
    const r = evaluatePenalty(detail(4, 0));
    expect(r.c1Status).toBe('hansoku');
    expect(r.isHansoku).toBe(true);
  });

  it('progression of C2 is independent of C1', () => {
    expect(evaluatePenalty(detail(0, 1)).c2Status).toBe('chukoku');
    expect(evaluatePenalty(detail(0, 4)).c2Status).toBe('hansoku');
    expect(evaluatePenalty(detail(0, 4)).isHansoku).toBe(true);
  });

  it('C1=3 and C2=3 does not trigger hansoku', () => {
    const r = evaluatePenalty(detail(3, 3));
    expect(r.c1Status).toBe('hansoku_chui');
    expect(r.c2Status).toBe('hansoku_chui');
    expect(r.isHansoku).toBe(false);
  });

  it('isHansoku true if any category reaches hansoku', () => {
    expect(evaluatePenalty(detail(4, 1)).isHansoku).toBe(true);
    expect(evaluatePenalty(detail(1, 4)).isHansoku).toBe(true);
  });
});
