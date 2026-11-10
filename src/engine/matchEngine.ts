// ============================================================
// Stat Eleven - 경기 시뮬레이션 엔진
// ------------------------------------------------------------
// 1) 라인업 → 유닛별 전력(공격/중원/수비/GK/스피드) 계산
// 2) 전술 파라미터 + 상대 전술과의 상성 → 보정치(SideMods)
// 3) 1분 단위 90분 루프: 체력 소모 → 점유 → 패스 → 찬스 → 슈팅 → 파울
// 4) 이벤트 로그 + 분 단위 스냅샷 + 선수 평점/MVP 산출
// 경기 결과는 킥오프 시점에 전부 계산되고, UI는 타임라인을 재생만 한다.
// ============================================================
import { FORMATIONS } from '../data/formations';
import type {
  FormationId,
  MatchEvent,
  MatchEventType,
  MatchResult,
  MinuteSnapshot,
  Player,
  PlayerMatchRating,
  Position,
  Side,
  TacticalInsight,
  Tactics,
  TeamMatchStats,
  TeamProfile,
  TeamSheet,
} from '../types';
import { conditionFactor, positionFit, ratingAtRole } from './ratings';

// ---------------- 유틸 ----------------
const rand = () => Math.random();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
function weightedPick<T>(items: T[], weight: (t: T) => number): T {
  const ws = items.map((i) => Math.max(0, weight(i)));
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return pickOne(items);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
/** 확률적 반올림 (기대값 보존) */
const stochRound = (v: number) => Math.floor(v) + (rand() < v - Math.floor(v) ? 1 : 0);

// ============================================================
// 1. 팀 전력 프로필
// ============================================================
export function computeTeamProfile(lineup: (Player | null)[], formation: FormationId): TeamProfile {
  const slots = FORMATIONS[formation];
  const dfRatings: number[] = [];
  const mfMid: number[] = [];
  const mfDef: number[] = [];
  const mfAtt: number[] = [];
  const fwRatings: number[] = [];
  const outfieldSpeed: number[] = [];
  const dfSpeed: number[] = [];
  let gk = 20;

  slots.forEach((slot, i) => {
    const p = lineup[i];
    if (!p) {
      // 빈 슬롯은 아주 약한 선수로 취급
      if (slot.role === 'DF') dfRatings.push(20);
      if (slot.role === 'MF') { mfMid.push(20); mfDef.push(20); mfAtt.push(20); }
      if (slot.role === 'FW') fwRatings.push(20);
      return;
    }
    const fit = positionFit(p.position, slot.role);
    const cf = conditionFactor(p.condition);
    const s = p.stats;
    if (slot.role === 'GK') {
      gk = ratingAtRole(p, 'GK') * cf;
      return;
    }
    outfieldSpeed.push(s.speed * fit * cf);
    if (slot.role === 'DF') {
      dfRatings.push(ratingAtRole(p, 'DF') * cf);
      dfSpeed.push(s.speed * fit * cf);
    } else if (slot.role === 'MF') {
      mfMid.push((s.passing * 0.35 + s.tactical * 0.25 + s.dribbling * 0.2 + s.physical * 0.2) * fit * cf);
      mfDef.push((s.defending * 0.7 + s.physical * 0.3) * fit * cf);
      mfAtt.push((s.shooting * 0.5 + s.dribbling * 0.5) * fit * cf);
    } else {
      fwRatings.push(ratingAtRole(p, 'FW') * cf);
    }
  });

  const nDF = dfRatings.length;
  const nMF = mfMid.length;
  const nFW = fwRatings.length;

  const defense = (avg(dfRatings) * 0.75 + avg(mfDef) * 0.25) * (1 + (nDF - 4) * 0.05);
  const midfield = avg(mfMid) * (1 + (nMF - 3) * 0.04);
  const attack = (avg(fwRatings) * 0.7 + avg(mfAtt) * 0.3) * (1 + (nFW - 2) * 0.04);
  const pace = avg(outfieldSpeed);
  const defPace = avg(dfSpeed) || pace;
  const overall = attack * 0.27 + midfield * 0.27 + defense * 0.28 + gk * 0.18;

  return { attack, midfield, defense, goalkeeper: gk, pace, defPace, overall };
}

// ============================================================
// 2. 전술 보정 & 상성
// ============================================================
export interface SideMods {
  possWeight: number;
  chanceRate: number;
  chanceQuality: number;
  passAcc: number; // 가산치
  drain: number;
  foulRate: number;
  attackMod: number;
  defenseMod: number;
  passVolume: number;
}

function baseMods(t: Tactics): SideMods {
  const m: SideMods = {
    possWeight: 1, chanceRate: 1, chanceQuality: 1, passAcc: 0,
    drain: 1, foulRate: 1, attackMod: 1, defenseMod: 1, passVolume: 1,
  };
  // 압박 강도
  if (t.pressing === 'high') { m.possWeight *= 1.06; m.drain *= 1.35; m.foulRate *= 1.3; }
  if (t.pressing === 'low') { m.possWeight *= 0.95; m.defenseMod *= 1.05; m.drain *= 0.85; m.foulRate *= 0.8; }
  // 빌드업
  if (t.buildUp === 'short') { m.possWeight *= 1.08; m.passAcc += 0.06; m.chanceRate *= 0.95; m.passVolume *= 1.2; }
  if (t.buildUp === 'long') { m.possWeight *= 0.9; m.passAcc -= 0.1; m.chanceRate *= 1.05; m.chanceQuality *= 1.04; m.passVolume *= 0.8; }
  // 템포
  if (t.tempo === 'fast') { m.chanceRate *= 1.15; m.passAcc -= 0.04; m.drain *= 1.2; m.passVolume *= 0.9; }
  if (t.tempo === 'slow') { m.chanceRate *= 0.88; m.possWeight *= 1.05; m.passAcc += 0.04; m.drain *= 0.9; m.passVolume *= 1.1; }
  // 수비 라인
  if (t.defLine === 'high') { m.attackMod *= 1.04; m.possWeight *= 1.03; }
  if (t.defLine === 'low') { m.defenseMod *= 1.08; m.attackMod *= 0.93; m.possWeight *= 0.96; }
  return m;
}

interface MatchupInput {
  tactics: Tactics;
  profile: TeamProfile;
  formation: FormationId;
  avgPhysical: number;
}

/** 양 팀 전술 상성 계산 → 보정치 + 분석 코멘트 */
export function analyzeMatchup(home: MatchupInput, away: MatchupInput) {
  const mods: Record<Side, SideMods> = { home: baseMods(home.tactics), away: baseMods(away.tactics) };
  const insights: TacticalInsight[] = [];
  const sides: [Side, MatchupInput, Side, MatchupInput][] = [
    ['home', home, 'away', away],
    ['away', away, 'home', home],
  ];

  for (const [sa, a, sb, b] of sides) {
    const ma = mods[sa];
    const mb = mods[sb];
    if (a.tactics.pressing === 'high' && b.tactics.buildUp === 'short') {
      ma.chanceRate *= 1.12; mb.passAcc -= 0.05;
      insights.push({ side: sa, positive: true, text: '강한 전방 압박이 상대의 짧은 빌드업을 끊어냅니다.' });
    }
    if (a.tactics.pressing === 'high' && b.tactics.buildUp === 'long') {
      mb.chanceQuality *= 1.06;
      insights.push({ side: sb, positive: true, text: '롱볼 전개로 상대의 전방 압박을 우회합니다.' });
    }
    if (a.tactics.buildUp === 'long' && b.tactics.defLine === 'high') {
      const paceGap = Math.max(0, a.profile.pace - b.profile.defPace) / 100;
      ma.chanceQuality *= 1.12 + paceGap;
      insights.push({ side: sa, positive: true, text: '상대의 높은 수비 라인 뒷공간을 롱볼로 공략합니다.' });
    }
    if (a.tactics.tempo === 'fast' && b.tactics.defLine === 'high') {
      ma.chanceQuality *= 1.06;
    }
    if (a.tactics.buildUp === 'long' && b.tactics.defLine === 'low') {
      ma.chanceQuality *= 0.9;
      insights.push({ side: sb, positive: true, text: '내려앉은 수비 블록이 롱볼을 효과적으로 흡수합니다.' });
    }
    if (a.tactics.buildUp === 'short' && b.tactics.pressing === 'low') {
      ma.possWeight *= 1.06;
      insights.push({ side: sa, positive: true, text: '상대의 소극적인 압박 덕분에 점유율을 장악합니다.' });
    }
    if (a.tactics.defLine === 'high' && a.tactics.pressing === 'low') {
      ma.defenseMod *= 0.94;
      insights.push({ side: sa, positive: false, text: '압박 없는 높은 수비 라인은 뒷공간 노출 위험이 큽니다.' });
    }
    if (a.tactics.tempo === 'slow' && b.tactics.defLine === 'low') {
      ma.chanceRate *= 0.92;
      insights.push({ side: sa, positive: false, text: '느린 템포로는 밀집 수비를 공략하기 어렵습니다.' });
    }
    if ((a.tactics.pressing === 'high' || a.tactics.tempo === 'fast') && a.avgPhysical < 60) {
      ma.drain *= 1.12;
      insights.push({ side: sa, positive: false, text: '피지컬이 약한 스쿼드에 고강도 전술은 체력 부담이 큽니다.' });
    }
    if (a.formation === '3-5-2' && (b.formation === '4-3-3' || b.formation === '4-2-3-1')) {
      ma.defenseMod *= 0.96; ma.possWeight *= 1.04;
      insights.push({ side: sa, positive: true, text: '3-5-2의 중원 숫자 우위로 점유를 가져가지만 측면 수비는 불안합니다.' });
    }
    if (a.formation === '4-4-2' && b.formation === '3-5-2') {
      ma.attackMod *= 1.04;
      insights.push({ side: sa, positive: true, text: '투톱이 상대 스리백과 1:1 상황을 자주 만듭니다.' });
    }
  }
  return { mods, insights };
}

// ============================================================
// 3. 경기 시뮬레이션
// ============================================================
interface Tally {
  goals: number; assists: number; saves: number; keyPasses: number;
  onTarget: number; offTarget: number; defActions: number; yellow: number; red: boolean;
}

interface SideState {
  side: Side;
  sheet: TeamSheet;
  roles: Position[];
  labels: string[];
  active: boolean[];
  profile: TeamProfile;
  mods: SideMods;
  stamina: number;
  startStamina: number;
  avgPhysical: number;
  passAccBase: number;
  redPenalty: number;
  stats: TeamMatchStats;
  possSum: number;
}

const emptyStats = (): TeamMatchStats => ({
  possession: 50, shots: 0, onTarget: 0, passes: 0, passesCompleted: 0,
  fouls: 0, yellows: 0, reds: 0, xg: 0,
});

const FINISH_R = ['오른발 강슛', '침착한 마무리', '낮게 깔아 찬 슈팅', '중거리 대포알', '칩슛'];
const FINISH_L = ['왼발 감아차기', '왼발 발리', '침착한 마무리', '중거리 대포알', '칩슛'];
const FINISH_HEAD = ['정확한 헤더', '다이빙 헤더'];
const PASS_DESC = ['날카로운 스루패스', '정확한 크로스', '센스 있는 컷백', '절묘한 로빙 패스', '원투 패스'];
const SAVE_DESC = ['몸을 날려 막아냅니다!', '손끝으로 쳐냅니다!', '정면에서 잡아냅니다.', '반사 신경으로 선방!'];
const OFF_DESC = ['골대를 벗어납니다.', '크로스바를 넘깁니다.', '골포스트를 강타합니다!', '아쉽게 빗나갑니다.'];
const FOUL_DESC = ['거친 태클', '역습 저지 반칙', '유니폼 잡아당기기', '늦은 태클', '항의'];

export function simulateMatch(home: TeamSheet, away: TeamSheet): MatchResult {
  const makeSide = (side: Side, sheet: TeamSheet): SideState => {
    const slots = FORMATIONS[sheet.formation];
    const profile = computeTeamProfile(sheet.lineup, sheet.formation);
    const stamina = avg(sheet.lineup.map((p) => p.condition));
    const avgPhysical = avg(sheet.lineup.map((p) => p.stats.physical));
    return {
      side, sheet, profile,
      roles: slots.map((s) => s.role),
      labels: slots.map((s) => s.label),
      active: sheet.lineup.map(() => true),
      mods: baseMods(sheet.tactics),
      stamina, startStamina: stamina, avgPhysical,
      passAccBase: 0,
      redPenalty: 1,
      stats: emptyStats(),
      possSum: 0,
    };
  };

  const H = makeSide('home', home);
  const A = makeSide('away', away);
  const { mods, insights } = analyzeMatchup(
    { tactics: home.tactics, profile: H.profile, formation: home.formation, avgPhysical: H.avgPhysical },
    { tactics: away.tactics, profile: A.profile, formation: away.formation, avgPhysical: A.avgPhysical },
  );
  H.mods = mods.home;
  A.mods = mods.away;
  for (const s of [H, A]) {
    const passing = avg(s.sheet.lineup.map((p) => p.stats.passing));
    s.passAccBase = clamp(0.58 + (passing / 100) * 0.32 + s.mods.passAcc, 0.5, 0.94);
  }
  // 홈 어드밴티지
  H.mods.chanceRate *= 1.04;

  const tallies = new Map<string, Tally>();
  for (const p of [...home.lineup, ...away.lineup]) {
    tallies.set(p.id, { goals: 0, assists: 0, saves: 0, keyPasses: 0, onTarget: 0, offTarget: 0, defActions: 0, yellow: 0, red: false });
  }
  const T = (id: string) => tallies.get(id)!;

  let hg = 0;
  let ag = 0;
  const events: MatchEvent[] = [];
  const timeline: MinuteSnapshot[] = [];
  const emit = (minute: number, type: MatchEventType, text: string, side?: Side, playerId?: string, assistId?: string) =>
    events.push({ minute, type, text, side, playerId, assistId, score: [hg, ag] });

  const stamF = (s: SideState) => 0.82 + 0.18 * (s.stamina / 100);
  const teamTag = (s: SideState) => `[${s.sheet.short}]`;
  const opp = (s: SideState) => (s === H ? A : H);

  const activeIdx = (s: SideState, filter?: (role: Position) => boolean) =>
    s.sheet.lineup.map((_, i) => i).filter((i) => s.active[i] && (!filter || filter(s.roles[i])));

  const gkOf = (s: SideState): Player | null => {
    const i = s.roles.indexOf('GK');
    return i >= 0 && s.active[i] ? s.sheet.lineup[i] : null;
  };

  const snapshot = (minute: number) => {
    const totalPoss = H.possSum + A.possSum || 1;
    const hs = { ...H.stats, possession: Math.round((H.possSum / totalPoss) * 100) };
    const as = { ...A.stats, possession: 100 - hs.possession };
    timeline.push({
      minute, homeGoals: hg, awayGoals: ag, home: hs, away: as,
      homeStamina: Math.round(H.stamina), awayStamina: Math.round(A.stamina),
    });
  };

  // ---- 찬스 처리 ----
  const resolveChance = (att: SideState, minute: number) => {
    const def = opp(att);
    const outfield = activeIdx(att, (r) => r !== 'GK');
    if (!outfield.length) return;
    const shooterIdx = weightedPick(outfield, (i) => {
      const p = att.sheet.lineup[i];
      const roleW = { GK: 0, DF: 0.45, MF: 2.2, FW: 5 }[att.roles[i]];
      return roleW * Math.pow(p.stats.shooting / 50, 2);
    });
    const shooter = att.sheet.lineup[shooterIdx];
    const assistPool = outfield.filter((i) => i !== shooterIdx);
    const assisterIdx = assistPool.length && rand() < 0.72
      ? weightedPick(assistPool, (i) => {
          const p = att.sheet.lineup[i];
          const roleW = { GK: 0, DF: 1.2, MF: 4, FW: 2 }[att.roles[i]];
          return roleW * Math.pow(p.stats.passing / 50, 2);
        })
      : -1;
    const assister = assisterIdx >= 0 ? att.sheet.lineup[assisterIdx] : null;

    const shootEff = shooter.stats.shooting * positionFit(shooter.position, att.roles[shooterIdx]) * stamF(att);
    const passBonus = assister ? 0.9 + (assister.stats.passing / 100) * 0.25 : 1;
    const xg = clamp((0.055 + rand() * 0.12) * att.mods.chanceQuality * passBonus * Math.pow(shootEff / 65, 0.7), 0.02, 0.6);

    att.stats.shots++;
    att.stats.xg += xg;

    // 결정적 패스 로그
    if (assister && xg > 0.14) {
      T(assister.id).keyPasses++;
      emit(minute, 'keyPass', `${teamTag(att)} ${assister.name}의 ${pickOne(PASS_DESC)}! ${shooter.name}에게 연결됩니다.`, att.side, assister.id);
    }

    // 블록
    const attPow = att.profile.attack * att.mods.attackMod;
    const defPow = def.profile.defense * def.mods.defenseMod * def.redPenalty;
    const blockP = clamp(0.2 * (defPow / Math.max(attPow, 1)), 0.1, 0.35);
    if (rand() < blockP) {
      const defenders = activeIdx(def, (r) => r === 'DF' || r === 'MF');
      if (defenders.length) {
        const bi = weightedPick(defenders, (i) => (def.roles[i] === 'DF' ? 3 : 1) * def.sheet.lineup[i].stats.defending);
        const blocker = def.sheet.lineup[bi];
        T(blocker.id).defActions++;
        if (rand() < 0.55) emit(minute, 'blocked', `${teamTag(def)} ${blocker.name}가 몸을 던져 ${shooter.name}의 슈팅을 차단합니다.`, def.side, blocker.id);
      }
      return;
    }

    const onTargetP = clamp(0.27 + (shootEff / 100) * 0.25 + xg * 0.5, 0.25, 0.72);
    if (rand() < onTargetP) {
      att.stats.onTarget++;
      T(shooter.id).onTarget++;
      const gk = gkOf(def);
      const gkRating = gk ? ratingAtRole(gk, 'GK') * stamF(def) : 15;
      const goalP = clamp(xg * 2.3 * Math.pow(65 / Math.max(gkRating, 15), 0.8), 0.05, 0.85);
      if (rand() < goalP) {
        if (att === H) hg++; else ag++;
        T(shooter.id).goals++;
        if (assister) T(assister.id).assists++;
        const finish = shooter.position === 'FW' && rand() < 0.2
          ? pickOne(FINISH_HEAD)
          : pickOne(shooter.foot === 'L' ? FINISH_L : FINISH_R);
        const assistTxt = assister ? ` (도움: ${assister.name})` : '';
        emit(minute, 'goal', `⚽ 골!! ${teamTag(att)} ${shooter.name}의 ${finish}!${assistTxt}  ${hg} - ${ag}`, att.side, shooter.id, assister?.id);
      } else if (gk) {
        T(gk.id).saves++;
        emit(minute, 'save', `${teamTag(def)} GK ${gk.name}, ${shooter.name}의 슈팅을 ${pickOne(SAVE_DESC)}`, def.side, gk.id);
      }
    } else {
      T(shooter.id).offTarget++;
      emit(minute, 'shotOff', `${teamTag(att)} ${shooter.name}의 슈팅, ${pickOne(OFF_DESC)}`, att.side, shooter.id);
    }
  };

  // ---- 파울 처리 ----
  const resolveFoul = (s: SideState, minute: number) => {
    s.stats.fouls++;
    const pool = activeIdx(s, (r) => r !== 'GK');
    if (!pool.length) return;
    const idx = weightedPick(pool, (i) => (s.roles[i] === 'DF' ? 3 : s.roles[i] === 'MF' ? 2 : 1));
    const p = s.sheet.lineup[idx];
    const t = T(p.id);
    const straightRed = rand() < 0.008;
    if (straightRed || rand() < 0.13) {
      if (straightRed || t.yellow >= 1) {
        if (!straightRed) { t.yellow++; s.stats.yellows++; }
        t.red = true;
        s.stats.reds++;
        s.active[idx] = false;
        s.redPenalty *= 0.88;
        emit(minute, 'red', `🟥 퇴장! ${teamTag(s)} ${p.name}${straightRed ? ' 다이렉트 레드카드' : ' 경고 누적'}. 수적 열세에 놓입니다.`, s.side, p.id);
      } else {
        t.yellow++;
        s.stats.yellows++;
        emit(minute, 'yellow', `🟨 ${teamTag(s)} ${p.name} 경고 (${pickOne(FOUL_DESC)})`, s.side, p.id);
      }
    }
  };

  emit(0, 'kickoff', `휘슬과 함께 경기 시작! ${home.name} vs ${away.name}`);
  snapshot(0);
  const insightMinutes = [12, 33, 58, 74];
  const insightQueue = [...insights];

  for (let minute = 1; minute <= 90; minute++) {
    // 체력 소모
    for (const s of [H, A]) {
      const drain = 0.22 * s.mods.drain * (1.15 - s.avgPhysical / 250);
      s.stamina = clamp(s.stamina - drain * (0.8 + rand() * 0.4), 15, 100);
    }

    // 점유
    const midH = H.profile.midfield * H.mods.possWeight * stamF(H) * H.redPenalty;
    const midA = A.profile.midfield * A.mods.possWeight * stamF(A) * A.redPenalty;
    const pHome = clamp(Math.pow(midH, 1.5) / (Math.pow(midH, 1.5) + Math.pow(midA, 1.5)), 0.28, 0.72);
    H.possSum += pHome;
    A.possSum += 1 - pHome;

    // 패스
    for (const [s, share] of [[H, pHome], [A, 1 - pHome]] as [SideState, number][]) {
      const passes = stochRound(share * 11 * s.mods.passVolume * (0.85 + rand() * 0.3));
      const acc = clamp(s.passAccBase * (0.94 + 0.06 * stamF(s)) * s.redPenalty + (rand() - 0.5) * 0.06, 0.4, 0.97);
      s.stats.passes += passes;
      s.stats.passesCompleted += Math.min(passes, stochRound(passes * acc));
    }

    // 공격 기회
    const owner = rand() < pHome ? H : A;
    const other = opp(owner);
    const att = owner.profile.attack * owner.mods.attackMod * stamF(owner) * owner.redPenalty;
    const def = other.profile.defense * other.mods.defenseMod * stamF(other) * other.redPenalty;
    const ratio = att / (att + def);
    const chanceP = clamp(0.23 * owner.mods.chanceRate * Math.pow(ratio * 2, 1.1), 0.05, 0.5);
    if (rand() < chanceP) {
      resolveChance(owner, minute);
    } else if (rand() < 0.08) {
      // 수비 성공(인터셉트/태클)으로 평점 가산
      const pool = activeIdx(other, (r) => r === 'DF' || r === 'MF');
      if (pool.length) T(other.sheet.lineup[pickOne(pool)].id).defActions++;
    }

    // 파울
    for (const s of [H, A]) if (rand() < 0.12 * s.mods.foulRate) resolveFoul(s, minute);

    // 전술 코멘트
    if (insightMinutes.includes(minute) && insightQueue.length) {
      const ins = insightQueue.shift()!;
      const team = ins.side === 'home' ? H : A;
      emit(minute, 'info', `📋 전술 분석 ${teamTag(team)} ${ins.text}`, ins.side);
    }

    if (minute === 45) emit(45, 'halftime', `전반 종료. ${home.short} ${hg} - ${ag} ${away.short}`);
    snapshot(minute);
  }
  emit(90, 'fulltime', `경기 종료! 최종 스코어 ${home.name} ${hg} - ${ag} ${away.name}`);

  // ---- 평점 ----
  const ratings: PlayerMatchRating[] = [];
  for (const s of [H, A]) {
    const gf = s === H ? hg : ag;
    const ga = s === H ? ag : hg;
    const resultBonus = gf > ga ? 0.3 : gf < ga ? -0.25 : 0;
    s.sheet.lineup.forEach((p, i) => {
      const t = T(p.id);
      const role = s.roles[i];
      let r = 6.4 + resultBonus;
      r += (ratingAtRole(p, role) - 60) / 40 * 0.4;
      r += t.goals * 1.0 + t.assists * 0.7 + t.keyPasses * 0.2 + t.onTarget * 0.12 - t.offTarget * 0.04;
      r += t.saves * 0.3 + t.defActions * 0.12 - t.yellow * 0.3 - (t.red ? 1.2 : 0);
      if (role === 'GK') r += ga === 0 ? 0.6 : -0.3 * ga;
      if (role === 'DF') r += ga === 0 ? 0.35 : -0.12 * ga;
      r += (rand() - 0.5) * 0.4;
      ratings.push({
        playerId: p.id, name: p.name, position: s.labels[i], side: s.side,
        rating: Math.round(clamp(r, 6.0, 10.0) * 10) / 10,
        goals: t.goals, assists: t.assists, saves: t.saves, keyPasses: t.keyPasses,
        yellow: t.yellow, red: t.red,
      });
    });
  }
  const winner: Side | null = hg > ag ? 'home' : ag > hg ? 'away' : null;
  const mvp = [...ratings].sort((a, b) =>
    b.rating - a.rating || (b.side === winner ? 1 : 0) - (a.side === winner ? 1 : 0))[0];

  const last = timeline[timeline.length - 1];
  return {
    homeId: home.id, awayId: away.id,
    homeName: home.name, awayName: away.name,
    homeColor: home.color, awayColor: away.color,
    homeGoals: hg, awayGoals: ag,
    events, timeline,
    stats: { home: last.home, away: last.away },
    ratings,
    mvpId: mvp.playerId,
    insights,
    staminaDrop: {
      home: Math.max(0, H.startStamina - H.stamina),
      away: Math.max(0, A.startStamina - A.stamina),
    },
  };
}
