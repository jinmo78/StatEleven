import type { Fixture, TableRow } from '../types';

/** 서클 방식 더블 라운드로빈 일정 생성 */
export function createFixtures(teamIds: string[]): Fixture[][] {
  const ids = [...teamIds].sort(() => Math.random() - 0.5);
  if (ids.length % 2) ids.push('__bye__');
  const n = ids.length;
  const firstHalf: Fixture[][] = [];
  const rot = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a === '__bye__' || b === '__bye__') continue;
      // 홈/원정 교차
      round.push(r % 2 === 0 ? { home: a, away: b, played: false } : { home: b, away: a, played: false });
    }
    firstHalf.push(round);
    rot.splice(1, 0, rot.pop()!);
  }
  const secondHalf = firstHalf.map((round) => round.map((f) => ({ home: f.away, away: f.home, played: false })));
  return [...firstHalf, ...secondHalf];
}

export function emptyTable(teamIds: string[]): TableRow[] {
  return teamIds.map((teamId) => ({
    teamId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, form: [],
  }));
}

export function applyResult(table: TableRow[], home: string, away: string, hg: number, ag: number): TableRow[] {
  return table.map((row) => {
    if (row.teamId !== home && row.teamId !== away) return row;
    const isHome = row.teamId === home;
    const gf = isHome ? hg : ag;
    const ga = isHome ? ag : hg;
    const res: 'W' | 'D' | 'L' = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    return {
      ...row,
      played: row.played + 1,
      won: row.won + (res === 'W' ? 1 : 0),
      drawn: row.drawn + (res === 'D' ? 1 : 0),
      lost: row.lost + (res === 'L' ? 1 : 0),
      gf: row.gf + gf,
      ga: row.ga + ga,
      points: row.points + (res === 'W' ? 3 : res === 'D' ? 1 : 0),
      form: [...row.form, res].slice(-5),
    };
  });
}

export function sortTable(table: TableRow[]): TableRow[] {
  return [...table].sort(
    (a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.teamId.localeCompare(b.teamId),
  );
}

export function seasonPrize(rank: number): number {
  if (rank === 1) return 5000;
  if (rank === 2) return 3500;
  if (rank === 3) return 2500;
  return Math.max(600, 1500 - (rank - 4) * 150);
}
