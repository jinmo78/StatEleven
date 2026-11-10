import { KEY_STATS, overall } from '../engine/ratings';
import type { Foot, Player, Position, StatKey, Stats } from '../types';
import { STAT_KEYS } from '../types';

// 가상의 선수 이름 풀 (실존 인물과 무관)
const FIRST = [
  '민준', '서준', '도윤', '하준', '지호', '준우', '현우', '건우', '우진', '선우',
  'Leo', 'Mateo', 'Lucas', 'Noah', 'Rafael', 'Tomas', 'Elias', 'Kai', 'Iker', 'Joel',
  'Marco', 'Nico', 'Hugo', 'Felix', 'Dario', 'Emil', 'Yuki', 'Ren', 'Sami', 'Adrian',
  'Bruno', 'Diego', 'Oskar', 'Luca', 'Theo', 'Milan', 'Enzo', 'Arda', 'Kenji', 'Ilan',
];
const LAST = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '한',
  'Varga', 'Moreau', 'Lindqvist', 'Okafor', 'Castell', 'Brandt', 'Novak', 'Ferro', 'Dahl', 'Sato',
  'Quint', 'Ribera', 'Holm', 'Keane', 'Mendel', 'Arvid', 'Tanaka', 'Pereira', 'Zoric', 'Velde',
  'Marsh', 'Lowe', 'Abara', 'Costa', 'Hale', 'Ivers', 'Kade', 'Roux', 'Soler', 'Wren',
];

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const rndInt = (lo: number, hi: number) => Math.floor(rnd(lo, hi + 1));

let idCounter = 0;
export const newId = (prefix = 'p') =>
  `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function randomName(): string {
  const last = LAST[rndInt(0, LAST.length - 1)];
  const first = FIRST[rndInt(0, FIRST.length - 1)];
  const isKorean = /[가-힣]/.test(last);
  const firstIsKorean = /[가-힣]/.test(first);
  if (isKorean && firstIsKorean) return `${last}${first}`;
  if (!isKorean && !firstIsKorean) return `${first[0]}. ${last}`;
  // 혼합 조합은 다시 맞춰 준다
  return isKorean ? `${last}${FIRST[rndInt(0, 9)]}` : `${FIRST[rndInt(10, FIRST.length - 1)][0]}. ${last}`;
}

/** 포지션별 능력치 편향 (목표 OVR 기준 가감) */
const BIAS: Record<Position, Stats> = {
  GK: { shooting: -30, passing: -10, dribbling: -25, defending: 6, physical: 2, speed: -5, tactical: 4 },
  DF: { shooting: -18, passing: -4, dribbling: -10, defending: 6, physical: 4, speed: 0, tactical: 2 },
  MF: { shooting: -4, passing: 6, dribbling: 3, defending: -6, physical: -3, speed: -2, tactical: 4 },
  FW: { shooting: 6, passing: -4, dribbling: 3, defending: -25, physical: -1, speed: 4, tactical: -6 },
};

const clampStat = (v: number) => Math.round(Math.max(20, Math.min(97, v)));

export function generatePlayer(position: Position, targetOvr: number, age?: number): Player {
  const stats = {} as Stats;
  for (const k of STAT_KEYS) stats[k] = clampStat(targetOvr + BIAS[position][k] + rnd(-7, 7));
  const p: Player = {
    id: newId(),
    name: randomName(),
    age: age ?? rndInt(18, 33),
    position,
    foot: (Math.random() < 0.7 ? 'R' : Math.random() < 0.8 ? 'L' : 'B') as Foot,
    stats,
    condition: rndInt(85, 100),
    level: 1,
    exp: 0,
  };
  // 목표 OVR에 근접하도록 핵심 스탯 보정
  for (let i = 0; i < 4; i++) {
    const diff = targetOvr - overall(p);
    if (Math.abs(diff) < 1) break;
    for (const k of STAT_KEYS) p.stats[k] = clampStat(p.stats[k] + diff);
  }
  return p;
}

export function randomPosition(): Position {
  const r = Math.random();
  if (r < 0.1) return 'GK';
  if (r < 0.42) return 'DF';
  if (r < 0.75) return 'MF';
  return 'FW';
}

/** 레벨업 시 포지션 핵심 스탯 위주로 성장 */
export function growthStat(position: Position): StatKey {
  return Math.random() < 0.7
    ? KEY_STATS[position][rndInt(0, KEY_STATS[position].length - 1)]
    : STAT_KEYS[rndInt(0, STAT_KEYS.length - 1)];
}

export { rnd, rndInt };
