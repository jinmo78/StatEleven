import { FORMATIONS } from './formations';
import { generatePlayer, rnd, rndInt } from './generators';
import type { AITeam, FormationId, Player, Position, Tactics } from '../types';

/** 초기 유저 스쿼드 16명: GK2 / DF5 / MF5 / FW4 */
export function createInitialSquad(): Player[] {
  const plan: [Position, number][] = [
    ['GK', 64], ['GK', 56],
    ['DF', 65], ['DF', 63], ['DF', 61], ['DF', 60], ['DF', 55],
    ['MF', 66], ['MF', 63], ['MF', 61], ['MF', 59], ['MF', 55],
    ['FW', 67], ['FW', 62], ['FW', 60], ['FW', 54],
  ];
  return plan.map(([pos, ovr]) => generatePlayer(pos, ovr + rndInt(-2, 2)));
}

interface AITeamSeed {
  id: string;
  name: string;
  short: string;
  color: string;
  formation: FormationId;
  tactics: Tactics;
  difficulty: number;
  styleNote: string;
}

const AI_SEEDS: AITeamSeed[] = [
  { id: 'ai_harbor', name: 'Harbor City FC', short: 'HBC', color: '#38bdf8', formation: '4-3-3',
    tactics: { pressing: 'high', buildUp: 'short', tempo: 'fast', defLine: 'high' }, difficulty: 5,
    styleNote: '고강도 게겐프레싱 + 높은 라인' },
  { id: 'ai_ironvale', name: 'Ironvale United', short: 'IRV', color: '#f87171', formation: '4-4-2',
    tactics: { pressing: 'medium', buildUp: 'long', tempo: 'fast', defLine: 'low' }, difficulty: 4,
    styleNote: '두 줄 수비 후 롱볼 역습' },
  { id: 'ai_northwind', name: 'Northwind Athletic', short: 'NWA', color: '#a78bfa', formation: '3-5-2',
    tactics: { pressing: 'medium', buildUp: 'short', tempo: 'slow', defLine: 'medium' }, difficulty: 4,
    styleNote: '중원 장악형 점유 축구' },
  { id: 'ai_redcliff', name: 'Redcliff Rovers', short: 'RCR', color: '#fb923c', formation: '4-2-3-1',
    tactics: { pressing: 'high', buildUp: 'balanced', tempo: 'normal', defLine: 'medium' }, difficulty: 3,
    styleNote: '밸런스형 압박 축구' },
  { id: 'ai_silverlake', name: 'Silverlake SC', short: 'SLK', color: '#e2e8f0', formation: '4-3-3',
    tactics: { pressing: 'low', buildUp: 'short', tempo: 'slow', defLine: 'medium' }, difficulty: 3,
    styleNote: '느린 템포의 티키타카' },
  { id: 'ai_stonebridge', name: 'Stonebridge Town', short: 'STB', color: '#facc15', formation: '4-4-2',
    tactics: { pressing: 'low', buildUp: 'long', tempo: 'normal', defLine: 'low' }, difficulty: 2,
    styleNote: '버스 세우기 + 세트피스' },
  { id: 'ai_eastport', name: 'Eastport Wanderers', short: 'EPW', color: '#2dd4bf', formation: '3-5-2',
    tactics: { pressing: 'high', buildUp: 'long', tempo: 'fast', defLine: 'high' }, difficulty: 2,
    styleNote: '공격 일변도의 난타전' },
  { id: 'ai_greenhill', name: 'Greenhill Albion', short: 'GHA', color: '#4ade80', formation: '4-2-3-1',
    tactics: { pressing: 'medium', buildUp: 'balanced', tempo: 'normal', defLine: 'medium' }, difficulty: 1,
    styleNote: '승격팀, 무난한 밸런스' },
  { id: 'ai_duskmoor', name: 'Duskmoor FC', short: 'DSM', color: '#f472b6', formation: '4-3-3',
    tactics: { pressing: 'medium', buildUp: 'long', tempo: 'fast', defLine: 'medium' }, difficulty: 1,
    styleNote: '빠른 윙어 활용 직선 축구' },
];

const DIFFICULTY_OVR: Record<number, number> = { 1: 55, 2: 59, 3: 63, 4: 67, 5: 71 };

export function buildAITeam(seed: AITeamSeed, ovrBoost = 0): AITeam {
  const base = DIFFICULTY_OVR[seed.difficulty] + ovrBoost;
  const players = FORMATIONS[seed.formation].map((slot) => {
    const p = generatePlayer(slot.role, Math.round(base + rnd(-4, 4)));
    p.condition = rndInt(88, 100);
    return p;
  });
  return { ...seed, players };
}

export function createAITeams(): AITeam[] {
  return AI_SEEDS.map((s) => buildAITeam(s));
}

/** 새 시즌: AI 팀 스탯 소폭 변동/성장 */
export function evolveAITeams(teams: AITeam[]): AITeam[] {
  return teams.map((t) => ({
    ...t,
    players: t.players.map((p) => {
      const delta = p.age < 27 ? rndInt(0, 3) : p.age > 31 ? rndInt(-3, 0) : rndInt(-1, 2);
      const stats = { ...p.stats };
      for (const k of Object.keys(stats) as (keyof typeof stats)[]) stats[k] = Math.max(20, Math.min(97, stats[k] + delta));
      return { ...p, age: p.age + 1, stats, condition: rndInt(88, 100) };
    }),
  }));
}

export const STARTING_GOLD = 3000;
export const STARTING_TP = 10;
