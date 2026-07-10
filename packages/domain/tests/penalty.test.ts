import { describe, expect, it } from 'vitest';
import { evaluatePenalty } from '../src/scoring/penalty';
import type { ScoreDetail } from '../src/types';

function detail(c: number): ScoreDetail {
  return { ippon: 0, wazaAri: 0, yuko: 0, c, total: 0 };
}

describe('evaluatePenalty — unified c track', () => {
  it('none at 0', () => {
    expect(evaluatePenalty(detail(0))).toEqual({ status: 'none', count: 0, isHansoku: false });
  });

  it('progresses c1 -> c4 for counts 1..4', () => {
    expect(evaluatePenalty(detail(1)).status).toBe('c1');
    expect(evaluatePenalty(detail(2)).status).toBe('c2');
    expect(evaluatePenalty(detail(3)).status).toBe('c3');
    expect(evaluatePenalty(detail(4)).status).toBe('c4');
    expect(evaluatePenalty(detail(4)).isHansoku).toBe(false);
  });

  it('hansoku at 5 with isHansoku true', () => {
    const r = evaluatePenalty(detail(5));
    expect(r.status).toBe('hansoku');
    expect(r.isHansoku).toBe(true);
  });

  it('caps the dot count at 5 even when c overshoots (e.g. 10-count = 5)', () => {
    expect(evaluatePenalty(detail(5)).count).toBe(5);
    expect(evaluatePenalty(detail(7)).count).toBe(5);
    expect(evaluatePenalty(detail(7)).isHansoku).toBe(true);
  });
});
