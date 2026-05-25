import type { ScoreDetail, ScoringEvent, Side } from '../types';

export const POINT_VALUES = {
  ippon: 3,
  waza_ari: 2,
  yuko: 1,
} as const;

const EMPTY_DETAIL: ScoreDetail = {
  ippon: 0,
  wazaAri: 0,
  yuko: 0,
  c1: 0,
  c2: 0,
};

function emptyDetail(): ScoreDetail {
  return { ...EMPTY_DETAIL };
}

export function aggregateScores(events: ScoringEvent[]): Record<Side, ScoreDetail> {
  const result: Record<Side, ScoreDetail> = {
    AKA: emptyDetail(),
    AO: emptyDetail(),
  };

  for (const ev of events) {
    const detail = result[ev.side];
    switch (ev.kind) {
      case 'ippon':    detail.ippon++;    break;
      case 'waza_ari': detail.wazaAri++;  break;
      case 'yuko':     detail.yuko++;     break;
      case 'c1':       detail.c1++;       break;
      case 'c2':       detail.c2++;       break;
      // hansoku / kiken / shikkaku do not affect ScoreDetail tallies.
    }
  }

  return result;
}

export function totalPoints(detail: ScoreDetail): number {
  return (
    detail.ippon * POINT_VALUES.ippon +
    detail.wazaAri * POINT_VALUES.waza_ari +
    detail.yuko * POINT_VALUES.yuko
  );
}
