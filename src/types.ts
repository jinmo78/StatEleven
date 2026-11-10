// ============================================================
// Stat Eleven - 핵심 데이터 타입
// ============================================================

export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type Foot = 'L' | 'R' | 'B';

export const STAT_KEYS = [
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
  'speed',
  'tactical',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  foot: Foot;
  stats: Stats;
  /** 0 ~ 100 */
  condition: number;
  level: number;
  exp: number;
}

// ---------------- 전술 ----------------
export type FormationId = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';

export interface FormationSlot {
  id: string;
  /** 표기용 세부 포지션 (LB, CM, ST ...) */
  label: string;
  /** 적합도 계산용 기본 포지션 */
  role: Position;
  /** 피치 좌표 (0~100). x: 좌→우, y: 상대 골문(0) → 우리 골문(100) */
  x: number;
  y: number;
}

export type PressingLevel = 'low' | 'medium' | 'high';
export type BuildUpStyle = 'short' | 'balanced' | 'long';
export type Tempo = 'slow' | 'normal' | 'fast';
export type DefensiveLine = 'low' | 'medium' | 'high';

export interface Tactics {
  pressing: PressingLevel;
  buildUp: BuildUpStyle;
  tempo: Tempo;
  defLine: DefensiveLine;
}

/** 경기 엔진에 투입되는 한 팀의 정보 */
export interface TeamSheet {
  id: string;
  name: string;
  short: string;
  color: string;
  formation: FormationId;
  tactics: Tactics;
  /** formation 슬롯 순서와 정렬된 11명 */
  lineup: Player[];
}

export interface AITeam {
  id: string;
  name: string;
  short: string;
  color: string;
  formation: FormationId;
  tactics: Tactics;
  players: Player[];
  /** 1(약) ~ 5(강) */
  difficulty: number;
  styleNote: string;
}

// ---------------- 경기 ----------------
export type Side = 'home' | 'away';

export type MatchEventType =
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'goal'
  | 'save'
  | 'shotOff'
  | 'blocked'
  | 'keyPass'
  | 'yellow'
  | 'red'
  | 'info';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side?: Side;
  text: string;
  playerId?: string;
  assistId?: string;
  /** 이벤트 직후 스코어 */
  score: [number, number];
}

export interface TeamMatchStats {
  possession: number; // %
  shots: number;
  onTarget: number;
  passes: number;
  passesCompleted: number;
  fouls: number;
  yellows: number;
  reds: number;
  xg: number;
}

export interface MinuteSnapshot {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  home: TeamMatchStats;
  away: TeamMatchStats;
  homeStamina: number;
  awayStamina: number;
}

export interface PlayerMatchRating {
  playerId: string;
  name: string;
  position: string;
  side: Side;
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  keyPasses: number;
  yellow: number;
  red: boolean;
}

export interface TacticalInsight {
  side: Side;
  positive: boolean;
  text: string;
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  timeline: MinuteSnapshot[];
  stats: { home: TeamMatchStats; away: TeamMatchStats };
  ratings: PlayerMatchRating[];
  mvpId: string;
  insights: TacticalInsight[];
  /** 경기 시작/종료 시 팀 평균 체력 */
  staminaDrop: { home: number; away: number };
}

export interface TeamProfile {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  pace: number;
  defPace: number;
  overall: number;
}

// ---------------- 리그 & 진행 ----------------
export interface Fixture {
  home: string;
  away: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface LeagueState {
  season: number;
  round: number; // 다음에 치를 라운드 index
  fixtures: Fixture[][];
  table: TableRow[];
}

export type MatchKind = 'league' | 'friendly';

export interface LiveMatch {
  kind: MatchKind;
  userSide: Side;
  opponentId: string;
  result: MatchResult;
  /** 현재 재생된 분 */
  minute: number;
  speed: 1 | 4;
  paused: boolean;
  finished: boolean;
  rewards?: MatchRewards;
}

export interface MatchRewards {
  gold: number;
  trainingPoints: number;
  exp: { playerId: string; name: string; exp: number; levelUp: boolean }[];
}

export interface MatchRecord {
  kind: MatchKind;
  season: number;
  opponentName: string;
  userSide: Side;
  goalsFor: number;
  goalsAgainst: number;
  mvpName: string;
}

export const USER_TEAM_ID = 'user';
