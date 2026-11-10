import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FORMATIONS } from '../data/formations';
import { generatePlayer, growthStat, randomPosition, rnd, rndInt } from '../data/generators';
import {
  createAITeams, createInitialSquad, evolveAITeams, STARTING_GOLD, STARTING_TP,
} from '../data/initialData';
import { applyResult, createFixtures, emptyTable, seasonPrize, sortTable } from '../engine/league';
import { simulateMatch } from '../engine/matchEngine';
import { conditionFactor, expToNext, marketValue, ratingAtRole } from '../engine/ratings';
import type {
  AITeam, FormationId, LeagueState, LiveMatch, MatchKind, MatchRecord, MatchRewards,
  Player, StatKey, Tactics, TeamSheet,
} from '../types';
import { USER_TEAM_ID } from '../types';

export const SQUAD_MAX = 25;
export const SQUAD_MIN = 11;
export const SCOUT_COST = { normal: 300, premium: 1200 } as const;
export const MARKET_REFRESH_COST = 100;
export const REST_COST = 150;
export const STAT_MAX = 99;
export const MAX_LEVEL = 30;
export const USER_COLOR = '#34d399';

export interface MarketListing {
  player: Player;
  price: number;
}

export interface SeasonSummary {
  season: number;
  rank: number;
  prize: number;
}

export type ScoutTier = keyof typeof SCOUT_COST;

interface GameData {
  clubName: string;
  clubShort: string;
  gold: number;
  trainingPoints: number;
  squad: Player[];
  formation: FormationId;
  tactics: Tactics;
  lineup: (string | null)[];
  aiTeams: AITeam[];
  league: LeagueState;
  market: MarketListing[];
  history: MatchRecord[];
  liveMatch: LiveMatch | null;
  seasonSummary: SeasonSummary | null;
}

interface GameActions {
  setFormation: (f: FormationId) => void;
  setTactic: <K extends keyof Tactics>(key: K, value: Tactics[K]) => void;
  assignSlot: (slotIndex: number, playerId: string | null) => void;
  autoLineup: () => void;
  scout: (tier: ScoutTier) => { ok: true; player: Player } | { ok: false; error: string };
  refreshMarket: () => string | null;
  buyPlayer: (playerId: string) => string | null;
  sellPlayer: (playerId: string) => string | null;
  trainStat: (playerId: string, stat: StatKey, method: 'tp' | 'gold') => string | null;
  restSquad: () => string | null;
  startMatch: (kind: MatchKind, opponentId?: string) => string | null;
  tickMatch: () => void;
  setMatchSpeed: (speed: 1 | 4) => void;
  togglePause: () => void;
  skipMatch: () => void;
  closeMatch: () => void;
  startNewSeason: () => void;
  resetGame: () => void;
}

export type GameStore = GameData & GameActions;

// ---------------- 헬퍼 ----------------
export function trainCost(value: number) {
  return { tp: value >= 80 ? 2 : 1, gold: 60 + Math.max(0, value - 50) * 8 };
}

function pickBestLineup(formation: FormationId, pool: Player[], preferred: string[] = []): (string | null)[] {
  const slots = FORMATIONS[formation];
  const used = new Set<string>();
  const result: (string | null)[] = slots.map(() => null);
  // GK → DF → FW → MF 순으로 채워 핵심 포지션 우선 확보
  const order = slots.map((s, i) => ({ s, i })).sort((a, b) => {
    const pri = { GK: 0, DF: 1, FW: 2, MF: 3 };
    return pri[a.s.role] - pri[b.s.role];
  });
  for (const { s, i } of order) {
    let best: Player | null = null;
    let bestScore = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const bonus = preferred.includes(p.id) ? 1.03 : 1;
      const score = ratingAtRole(p, s.role) * conditionFactor(p.condition) * bonus;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (best) { used.add(best.id); result[i] = best.id; }
  }
  return result;
}

function generateMarket(): MarketListing[] {
  return Array.from({ length: 6 }, () => {
    const roll = Math.random();
    const ovr = roll < 0.1 ? rndInt(70, 76) : roll < 0.45 ? rndInt(62, 69) : rndInt(52, 61);
    const player = generatePlayer(randomPosition(), ovr);
    return { player, price: Math.round((marketValue(player) * rnd(0.9, 1.2)) / 10) * 10 };
  });
}

function createInitialData(): GameData {
  const squad = createInitialSquad();
  const formation: FormationId = '4-3-3';
  const aiTeams = createAITeams();
  const ids = [USER_TEAM_ID, ...aiTeams.map((t) => t.id)];
  return {
    clubName: 'Stat Eleven FC',
    clubShort: 'SEF',
    gold: STARTING_GOLD,
    trainingPoints: STARTING_TP,
    squad,
    formation,
    tactics: { pressing: 'medium', buildUp: 'balanced', tempo: 'normal', defLine: 'medium' },
    lineup: pickBestLineup(formation, squad),
    aiTeams,
    league: { season: 1, round: 0, fixtures: createFixtures(ids), table: emptyTable(ids) },
    market: generateMarket(),
    history: [],
    liveMatch: null,
    seasonSummary: null,
  };
}

export function userLineupPlayers(s: Pick<GameData, 'squad' | 'lineup'>): (Player | null)[] {
  return s.lineup.map((id) => (id ? s.squad.find((p) => p.id === id) ?? null : null));
}

export function teamName(s: Pick<GameData, 'aiTeams' | 'clubName'>, id: string): string {
  if (id === USER_TEAM_ID) return s.clubName;
  return s.aiTeams.find((t) => t.id === id)?.name ?? id;
}

export function nextLeagueFixture(s: Pick<GameData, 'league'>) {
  const round = s.league.fixtures[s.league.round];
  if (!round) return null;
  const fx = round.find((f) => f.home === USER_TEAM_ID || f.away === USER_TEAM_ID);
  return fx ?? null;
}

// ---------------- 스토어 ----------------
export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** 경기 종료 처리: 보상, 경험치, 컨디션, 리그 반영 */
      const finalizeMatch = () => {
        const st = get();
        const lm = st.liveMatch;
        if (!lm || lm.rewards) return;
        const r = lm.result;
        const userGoals = lm.userSide === 'home' ? r.homeGoals : r.awayGoals;
        const oppGoals = lm.userSide === 'home' ? r.awayGoals : r.homeGoals;
        const outcome = userGoals > oppGoals ? 'W' : userGoals === oppGoals ? 'D' : 'L';
        const isLeague = lm.kind === 'league';

        const baseGold = isLeague ? { W: 400, D: 200, L: 100 }[outcome] : { W: 200, D: 100, L: 50 }[outcome];
        const gold = baseGold + userGoals * (isLeague ? 25 : 10);
        let tp = isLeague ? (outcome === 'W' ? 2 : 1) : outcome === 'W' ? 1 : 0;

        const userRatings = new Map(r.ratings.filter((x) => x.side === lm.userSide).map((x) => [x.playerId, x]));
        const drop = r.staminaDrop[lm.userSide];
        const expList: MatchRewards['exp'] = [];

        const squad = st.squad.map((p) => {
          const rating = userRatings.get(p.id);
          const played = !!rating;
          let exp = played ? 30 + Math.round((rating!.rating - 6) * 20) : 8;
          if (r.mvpId === p.id) exp += 20;
          const np: Player = { ...p, stats: { ...p.stats }, exp: p.exp + exp };
          let levelUp = false;
          while (np.level < MAX_LEVEL && np.exp >= expToNext(np.level)) {
            np.exp -= expToNext(np.level);
            np.level++;
            levelUp = true;
            tp++;
            for (let i = 0; i < 2; i++) {
              const k = growthStat(np.position);
              np.stats[k] = Math.min(STAT_MAX, np.stats[k] + 1);
            }
          }
          if (np.level >= MAX_LEVEL) np.exp = 0;
          np.condition = played
            ? Math.max(20, Math.round(p.condition - drop * rnd(0.8, 1.2)))
            : Math.min(100, p.condition + 18);
          if (played) expList.push({ playerId: p.id, name: p.name, exp, levelUp });
          return np;
        });

        let league = st.league;
        let seasonSummary = st.seasonSummary;
        let market = st.market;
        let prize = 0;
        if (isLeague) {
          let table = league.table;
          const round = league.fixtures[league.round].map((f) => {
            if (f.home === r.homeId && f.away === r.awayId) {
              table = applyResult(table, f.home, f.away, r.homeGoals, r.awayGoals);
              return { ...f, played: true, homeGoals: r.homeGoals, awayGoals: r.awayGoals };
            }
            // 다른 AI 경기는 즉시 시뮬레이션
            const h = st.aiTeams.find((t) => t.id === f.home)!;
            const a = st.aiTeams.find((t) => t.id === f.away)!;
            const sim = simulateMatch(aiSheet(h), aiSheet(a));
            table = applyResult(table, f.home, f.away, sim.homeGoals, sim.awayGoals);
            return { ...f, played: true, homeGoals: sim.homeGoals, awayGoals: sim.awayGoals };
          });
          const fixtures = league.fixtures.map((rd, i) => (i === league.round ? round : rd));
          league = { ...league, fixtures, table, round: league.round + 1 };
          market = generateMarket();
          if (league.round >= league.fixtures.length) {
            const rank = sortTable(table).findIndex((t) => t.teamId === USER_TEAM_ID) + 1;
            prize = seasonPrize(rank);
            seasonSummary = { season: league.season, rank, prize };
          }
        }

        const oppName = teamName(st, lm.opponentId);
        const mvp = r.ratings.find((x) => x.playerId === r.mvpId);
        const record: MatchRecord = {
          kind: lm.kind, season: st.league.season, opponentName: oppName, userSide: lm.userSide,
          goalsFor: userGoals, goalsAgainst: oppGoals, mvpName: mvp?.name ?? '-',
        };

        set({
          squad,
          gold: st.gold + gold + prize,
          trainingPoints: st.trainingPoints + tp,
          league,
          market,
          seasonSummary,
          // AI 팀은 로테이션으로 컨디션 회복
          aiTeams: st.aiTeams.map((t) => ({ ...t, players: t.players.map((p) => ({ ...p, condition: rndInt(86, 100) })) })),
          history: [record, ...st.history].slice(0, 30),
          liveMatch: { ...lm, minute: 90, finished: true, rewards: { gold: gold + prize, trainingPoints: tp, exp: expList } },
        });
      };

      return {
        ...createInitialData(),

        setFormation: (f) => {
          const st = get();
          const starters = st.lineup.filter((x): x is string => !!x);
          const pool = st.squad;
          set({ formation: f, lineup: pickBestLineup(f, pool, starters) });
        },

        setTactic: (key, value) => set((s) => ({ tactics: { ...s.tactics, [key]: value } })),

        assignSlot: (slotIndex, playerId) =>
          set((s) => {
            const lineup = [...s.lineup];
            if (playerId) {
              const prev = lineup.indexOf(playerId);
              if (prev >= 0) lineup[prev] = lineup[slotIndex]; // 선발끼리는 자리 교체
            }
            lineup[slotIndex] = playerId;
            return { lineup };
          }),

        autoLineup: () => set((s) => ({ lineup: pickBestLineup(s.formation, s.squad) })),

        scout: (tier) => {
          const st = get();
          const cost = SCOUT_COST[tier];
          if (st.squad.length >= SQUAD_MAX) return { ok: false, error: `스쿼드가 가득 찼습니다 (최대 ${SQUAD_MAX}명).` };
          if (st.gold < cost) return { ok: false, error: '골드가 부족합니다.' };
          const roll = Math.random();
          let ovr: number;
          let age: number;
          if (tier === 'normal') {
            ovr = roll < 0.06 ? rndInt(68, 74) : rndInt(50, 66);
            age = rndInt(18, 32);
          } else {
            ovr = roll < 0.1 ? rndInt(78, 85) : rndInt(64, 77);
            age = rndInt(18, 29);
          }
          const player = generatePlayer(randomPosition(), ovr, age);
          set({ gold: st.gold - cost, squad: [...st.squad, player] });
          return { ok: true, player };
        },

        refreshMarket: () => {
          const st = get();
          if (st.gold < MARKET_REFRESH_COST) return '골드가 부족합니다.';
          set({ gold: st.gold - MARKET_REFRESH_COST, market: generateMarket() });
          return null;
        },

        buyPlayer: (playerId) => {
          const st = get();
          const listing = st.market.find((m) => m.player.id === playerId);
          if (!listing) return '매물을 찾을 수 없습니다.';
          if (st.squad.length >= SQUAD_MAX) return `스쿼드가 가득 찼습니다 (최대 ${SQUAD_MAX}명).`;
          if (st.gold < listing.price) return '골드가 부족합니다.';
          set({
            gold: st.gold - listing.price,
            squad: [...st.squad, listing.player],
            market: st.market.filter((m) => m.player.id !== playerId),
          });
          return null;
        },

        sellPlayer: (playerId) => {
          const st = get();
          if (st.liveMatch && !st.liveMatch.finished) return '경기 중에는 판매할 수 없습니다.';
          if (st.squad.length <= SQUAD_MIN + 1) return `최소 ${SQUAD_MIN + 1}명 이상 보유해야 합니다.`;
          const p = st.squad.find((x) => x.id === playerId);
          if (!p) return '선수를 찾을 수 없습니다.';
          const price = Math.round(marketValue(p) * 0.6);
          set({
            gold: st.gold + price,
            squad: st.squad.filter((x) => x.id !== playerId),
            lineup: st.lineup.map((id) => (id === playerId ? null : id)),
          });
          return null;
        },

        trainStat: (playerId, stat, method) => {
          const st = get();
          const p = st.squad.find((x) => x.id === playerId);
          if (!p) return '선수를 찾을 수 없습니다.';
          const v = p.stats[stat];
          if (v >= STAT_MAX) return '이미 최대치입니다.';
          const cost = trainCost(v);
          if (method === 'tp' && st.trainingPoints < cost.tp) return '훈련 포인트가 부족합니다.';
          if (method === 'gold' && st.gold < cost.gold) return '골드가 부족합니다.';
          set({
            trainingPoints: method === 'tp' ? st.trainingPoints - cost.tp : st.trainingPoints,
            gold: method === 'gold' ? st.gold - cost.gold : st.gold,
            squad: st.squad.map((x) => (x.id === playerId ? { ...x, stats: { ...x.stats, [stat]: v + 1 } } : x)),
          });
          return null;
        },

        restSquad: () => {
          const st = get();
          if (st.gold < REST_COST) return '골드가 부족합니다.';
          set({
            gold: st.gold - REST_COST,
            squad: st.squad.map((p) => ({ ...p, condition: Math.min(100, p.condition + 25) })),
          });
          return null;
        },

        startMatch: (kind, opponentId) => {
          const st = get();
          if (st.liveMatch && !st.liveMatch.finished) return '이미 진행 중인 경기가 있습니다.';
          const players = userLineupPlayers(st);
          if (players.some((p) => !p)) return '선발 11명을 모두 배치해야 합니다.';

          let userSide: 'home' | 'away' = 'home';
          let oppId = opponentId;
          if (kind === 'league') {
            const fx = nextLeagueFixture(st);
            if (!fx) return '이번 시즌 리그 일정이 모두 끝났습니다.';
            userSide = fx.home === USER_TEAM_ID ? 'home' : 'away';
            oppId = userSide === 'home' ? fx.away : fx.home;
          }
          const opp = st.aiTeams.find((t) => t.id === oppId);
          if (!opp) return '상대 팀을 선택하세요.';

          const userSheet: TeamSheet = {
            id: USER_TEAM_ID, name: st.clubName, short: st.clubShort, color: USER_COLOR,
            formation: st.formation, tactics: st.tactics, lineup: players as Player[],
          };
          const oppSheet = aiSheet(opp);
          const result = userSide === 'home' ? simulateMatch(userSheet, oppSheet) : simulateMatch(oppSheet, userSheet);
          set({
            liveMatch: { kind, userSide, opponentId: opp.id, result, minute: 0, speed: 1, paused: false, finished: false },
          });
          return null;
        },

        tickMatch: () => {
          const lm = get().liveMatch;
          if (!lm || lm.finished || lm.paused) return;
          const minute = lm.minute + 1;
          if (minute >= 90) finalizeMatch();
          else set({ liveMatch: { ...lm, minute } });
        },

        setMatchSpeed: (speed) => {
          const lm = get().liveMatch;
          if (lm) set({ liveMatch: { ...lm, speed, paused: false } });
        },

        togglePause: () => {
          const lm = get().liveMatch;
          if (lm && !lm.finished) set({ liveMatch: { ...lm, paused: !lm.paused } });
        },

        skipMatch: () => finalizeMatch(),

        closeMatch: () => {
          const lm = get().liveMatch;
          if (lm?.finished) set({ liveMatch: null });
        },

        startNewSeason: () => {
          const st = get();
          const aiTeams = evolveAITeams(st.aiTeams);
          const ids = [USER_TEAM_ID, ...aiTeams.map((t) => t.id)];
          set({
            aiTeams,
            league: { season: st.league.season + 1, round: 0, fixtures: createFixtures(ids), table: emptyTable(ids) },
            seasonSummary: null,
            squad: st.squad.map((p) => ({ ...p, age: p.age + 1, condition: 100 })),
            market: generateMarket(),
          });
        },

        resetGame: () => set({ ...createInitialData() }),
      };
    },
    {
      name: 'stat-eleven-save',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // 액션 함수 제외하고 데이터만 저장
        const { clubName, clubShort, gold, trainingPoints, squad, formation, tactics, lineup,
          aiTeams, league, market, history, liveMatch, seasonSummary } = s;
        return { clubName, clubShort, gold, trainingPoints, squad, formation, tactics, lineup,
          aiTeams, league, market, history, liveMatch, seasonSummary };
      },
    },
  ),
);

export function aiSheet(t: AITeam): TeamSheet {
  return {
    id: t.id, name: t.name, short: t.short, color: t.color,
    formation: t.formation, tactics: t.tactics, lineup: t.players,
  };
}

