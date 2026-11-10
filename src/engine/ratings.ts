import type { Player, Position, StatKey, Stats } from '../types';

/** 포지션별 능력치 가중치 (오버롤 계산용). GK는 별도 골키핑 스탯이 없어 수비/전술/피지컬/스피드로 환산 */
export const ROLE_WEIGHTS: Record<Position, Partial<Record<StatKey, number>>> = {
  GK: { defending: 0.45, tactical: 0.25, physical: 0.15, speed: 0.15 },
  DF: { defending: 0.4, physical: 0.2, speed: 0.15, tactical: 0.15, passing: 0.1 },
  MF: { passing: 0.3, tactical: 0.2, dribbling: 0.15, defending: 0.1, physical: 0.1, shooting: 0.1, speed: 0.05 },
  FW: { shooting: 0.4, dribbling: 0.2, speed: 0.2, physical: 0.1, passing: 0.1 },
};

/** 포지션별 성장 시 우선 강화되는 핵심 스탯 */
export const KEY_STATS: Record<Position, StatKey[]> = {
  GK: ['defending', 'tactical', 'physical'],
  DF: ['defending', 'physical', 'speed'],
  MF: ['passing', 'tactical', 'dribbling'],
  FW: ['shooting', 'dribbling', 'speed'],
};

export function weightedRating(stats: Stats, role: Position): number {
  const w = ROLE_WEIGHTS[role];
  let sum = 0;
  for (const k of Object.keys(w) as StatKey[]) sum += stats[k] * (w[k] ?? 0);
  return sum;
}

export function overall(p: Player): number {
  return Math.round(weightedRating(p.stats, p.position));
}

/** 포지션 적합도 (원래 포지션 → 배치된 역할) */
export function positionFit(natural: Position, role: Position): number {
  if (natural === role) return 1;
  if (natural === 'GK' || role === 'GK') return 0.45;
  const order: Position[] = ['DF', 'MF', 'FW'];
  const diff = Math.abs(order.indexOf(natural) - order.indexOf(role));
  return diff === 1 ? 0.85 : 0.7;
}

/** 해당 슬롯 역할에서의 실효 능력치 */
export function ratingAtRole(p: Player, role: Position): number {
  return weightedRating(p.stats, role) * positionFit(p.position, role);
}

export function conditionFactor(condition: number): number {
  return 0.75 + 0.25 * (condition / 100);
}

export function expToNext(level: number): number {
  return 80 + level * 40;
}

export function ovrColor(ovr: number): string {
  if (ovr >= 80) return 'text-amber-300';
  if (ovr >= 70) return 'text-emerald-300';
  if (ovr >= 60) return 'text-sky-300';
  return 'text-slate-300';
}

export function ovrTier(ovr: number): { label: string; cls: string } {
  if (ovr >= 80) return { label: 'ELITE', cls: 'from-amber-500/30 to-amber-900/10 border-amber-400/60' };
  if (ovr >= 70) return { label: 'GOLD', cls: 'from-emerald-500/25 to-emerald-900/10 border-emerald-400/50' };
  if (ovr >= 60) return { label: 'SILVER', cls: 'from-sky-500/20 to-sky-900/10 border-sky-400/40' };
  return { label: 'BRONZE', cls: 'from-slate-500/20 to-slate-900/10 border-slate-500/40' };
}

export function marketValue(p: Player): number {
  const ovr = overall(p);
  const ageFactor = p.age <= 21 ? 1.3 : p.age <= 25 ? 1.15 : p.age <= 29 ? 1 : p.age <= 32 ? 0.75 : 0.5;
  const base = Math.pow(Math.max(ovr - 35, 5), 2.15) * 1.1;
  return Math.round((base * ageFactor) / 10) * 10;
}

export const STAT_LABELS: Record<StatKey, string> = {
  shooting: '슈팅',
  passing: '패스',
  dribbling: '드리블',
  defending: '수비',
  physical: '피지컬',
  speed: '스피드',
  tactical: '전술이해도',
};

export const STAT_SHORT: Record<StatKey, string> = {
  shooting: 'SHO',
  passing: 'PAS',
  dribbling: 'DRI',
  defending: 'DEF',
  physical: 'PHY',
  speed: 'SPD',
  tactical: 'TAC',
};

export const FOOT_LABEL = { L: '왼발', R: '오른발', B: '양발' } as const;

export const POSITION_COLOR: Record<Position, string> = {
  GK: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  DF: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  MF: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  FW: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};
