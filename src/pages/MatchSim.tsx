import { useMemo, useState } from 'react';
import {
  ArrowRight, Award, ChevronsRight, Coins, Crown, Dumbbell, FastForward, Pause, Play, Radio, Swords, Target, TrendingUp,
} from 'lucide-react';
import type { PageId } from '../App';
import { Btn, Card, Segmented, Stars, cn, notify } from '../components/ui';
import { analyzeMatchup, computeTeamProfile } from '../engine/matchEngine';
import { nextLeagueFixture, USER_COLOR, useGame, userLineupPlayers } from '../store/gameStore';
import type { LiveMatch, MatchEvent, MatchEventType, MatchKind, PlayerMatchRating, TeamMatchStats } from '../types';
import { USER_TEAM_ID } from '../types';

export default function MatchSim({ go }: { go: (p: PageId) => void }) {
  const live = useGame((s) => s.liveMatch);
  return live ? <LiveView live={live} go={go} /> : <PreMatch go={go} />;
}

// ============================================================
// 경기 전: 상대 선택 & 상성 분석
// ============================================================
function PreMatch({ go }: { go: (p: PageId) => void }) {
  const st = useGame();
  const [kind, setKind] = useState<MatchKind>('league');
  const fx = nextLeagueFixture(st);
  const leagueOppId = fx ? (fx.home === USER_TEAM_ID ? fx.away : fx.home) : null;
  const [friendlyOpp, setFriendlyOpp] = useState<string>(st.aiTeams[0]?.id ?? '');
  const oppId = kind === 'league' ? leagueOppId : friendlyOpp;
  const opp = st.aiTeams.find((t) => t.id === oppId) ?? null;
  const userSide = kind === 'league' && fx ? (fx.home === USER_TEAM_ID ? 'home' : 'away') : 'home';

  const lineupPlayers = useMemo(() => userLineupPlayers(st), [st.squad, st.lineup]);
  const incomplete = lineupPlayers.some((p) => !p);
  const myProfile = useMemo(() => computeTeamProfile(lineupPlayers, st.formation), [lineupPlayers, st.formation]);
  const analysis = useMemo(() => {
    if (!opp) return null;
    const oppProfile = computeTeamProfile(opp.players, opp.formation);
    const avgPhy = (ps: { stats: { physical: number } }[]) => ps.reduce((a, p) => a + p.stats.physical, 0) / Math.max(ps.length, 1);
    const me = { tactics: st.tactics, profile: myProfile, formation: st.formation, avgPhysical: avgPhy(lineupPlayers.filter((p) => !!p) as { stats: { physical: number } }[]) };
    const them = { tactics: opp.tactics, profile: oppProfile, formation: opp.formation, avgPhysical: avgPhy(opp.players) };
    const { insights } = userSide === 'home' ? analyzeMatchup(me, them) : analyzeMatchup(them, me);
    return { oppProfile, insights };
  }, [opp, st.tactics, st.formation, myProfile, lineupPlayers, userSide]);

  const tired = lineupPlayers.filter((p) => p && p.condition < 60).length;

  const kickoff = () => {
    const err = st.startMatch(kind, oppId ?? undefined);
    notify(err);
  };

  const tacticLabel = {
    pressing: { low: '낮은 압박', medium: '보통 압박', high: '전방 압박' },
    buildUp: { short: '짧은 패스', balanced: '밸런스', long: '롱볼 역습' },
    tempo: { slow: '느린 템포', normal: '보통 템포', fast: '빠른 템포' },
    defLine: { low: '낮은 라인', medium: '보통 라인', high: '높은 라인' },
  };
  const tacticText = (t: typeof st.tactics) =>
    `${tacticLabel.pressing[t.pressing]} · ${tacticLabel.buildUp[t.buildUp]} · ${tacticLabel.tempo[t.tempo]} · ${tacticLabel.defLine[t.defLine]}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Match Center</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">경기 시뮬레이션</h1>
        </div>
        <div className="w-64">
          <Segmented value={kind} onChange={setKind} options={[{ value: 'league', label: '리그 경기' }, { value: 'friendly', label: '친선 경기' }]} />
        </div>
      </div>

      {kind === 'friendly' && (
        <Card title="친선 경기 상대 선택" icon={<Swords size={16} />}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {st.aiTeams.map((t) => (
              <button key={t.id} type="button" onClick={() => setFriendlyOpp(t.id)}
                className={cn('rounded-lg border p-3 text-left transition-colors',
                  friendlyOpp === t.id ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-600')}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-slate-100">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}
                  </span>
                  <Stars n={t.difficulty} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{t.formation} · {t.styleNote}</div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">친선 경기는 순위에 반영되지 않으며 보상이 리그의 절반입니다. 선수 경험치는 동일하게 획득합니다.</p>
        </Card>
      )}

      {opp && analysis ? (
        <Card title={kind === 'league' ? `리그 라운드 ${st.league.round + 1}` : '친선 경기'} icon={<Target size={16} />}>
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <TeamHeader name={st.clubName} color={USER_COLOR} tag={userSide === 'home' ? 'HOME' : 'AWAY'} formation={st.formation} tactics={tacticText(st.tactics)} ovr={myProfile.overall} />
            <div className="text-center text-2xl font-black text-slate-600">VS</div>
            <TeamHeader name={opp.name} color={opp.color} tag={userSide === 'home' ? 'AWAY' : 'HOME'} formation={opp.formation} tactics={tacticText(opp.tactics)} ovr={analysis.oppProfile.overall} right />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">유닛 비교</div>
              {([
                ['공격', myProfile.attack, analysis.oppProfile.attack],
                ['중원', myProfile.midfield, analysis.oppProfile.midfield],
                ['수비', myProfile.defense, analysis.oppProfile.defense],
                ['골키퍼', myProfile.goalkeeper, analysis.oppProfile.goalkeeper],
                ['스피드', myProfile.pace, analysis.oppProfile.pace],
              ] as [string, number, number][]).map(([l, a, b]) => (
                <CompareRow key={l} label={l} a={a} b={b} />
              ))}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">전술 상성 분석</div>
              {analysis.insights.length === 0 ? (
                <div className="rounded-lg bg-slate-950/50 p-3 text-sm text-slate-400">두드러진 전술 상성이 없습니다. 선수 기량 싸움이 예상됩니다.</div>
              ) : (
                <ul className="space-y-1.5">
                  {analysis.insights.map((ins, i) => {
                    const mine = ins.side === userSide;
                    const good = mine === ins.positive;
                    return (
                      <li key={i} className={cn('flex gap-2 rounded-lg p-2.5 text-sm', good ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200')}>
                        <span className="shrink-0 text-xs font-bold">{mine ? '우리' : '상대'}</span>
                        <span>{ins.text}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <div className="space-y-1 text-xs">
              {incomplete && <div className="text-rose-300">⚠ 선발 11명을 모두 배치해야 킥오프할 수 있습니다.</div>}
              {tired > 0 && <div className="text-amber-300">⚠ 컨디션 60 미만 선발 선수 {tired}명 — 경기력이 저하됩니다.</div>}
              <button type="button" className="text-slate-400 underline-offset-2 hover:text-emerald-300 hover:underline" onClick={() => go('squad')}>
                전술/라인업 수정하기 →
              </button>
            </div>
            <Btn size="lg" onClick={kickoff} disabled={incomplete}><Play size={18} />킥오프</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="py-8 text-center text-sm text-slate-400">
            이번 시즌 리그 일정이 모두 끝났습니다.
            <div className="mt-3 flex justify-center gap-2">
              <Btn variant="outline" onClick={() => setKind('friendly')}>친선 경기 하기</Btn>
              <Btn variant="gold" onClick={() => go('league')}>새 시즌 시작</Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function TeamHeader({ name, color, tag, formation, tactics, ovr, right }: {
  name: string; color: string; tag: string; formation: string; tactics: string; ovr: number; right?: boolean;
}) {
  return (
    <div className={cn('rounded-lg bg-slate-950/50 p-4', right && 'md:text-right')}>
      <div className="text-[10px] font-bold tracking-widest text-slate-500">{tag}</div>
      <div className={cn('mt-1 flex items-center gap-2 text-lg font-bold text-slate-100', right && 'md:justify-end')}>
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />{name}
      </div>
      <div className="mt-1 text-xs text-slate-400">{formation} · 전력 <b className="text-slate-200">{ovr.toFixed(1)}</b></div>
      <div className="mt-0.5 text-[11px] text-slate-500">{tactics}</div>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: number; b: number }) {
  const total = a + b || 1;
  return (
    <div className="grid grid-cols-[36px_1fr_56px_1fr_36px] items-center gap-2 text-xs">
      <span className={cn('tabular text-right font-bold', a >= b ? 'text-emerald-300' : 'text-slate-400')}>{a.toFixed(0)}</span>
      <div className="flex h-1.5 justify-end overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(a / total) * 100}%` }} />
      </div>
      <span className="text-center text-slate-400">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-rose-400" style={{ width: `${(b / total) * 100}%` }} />
      </div>
      <span className={cn('tabular font-bold', b > a ? 'text-rose-300' : 'text-slate-400')}>{b.toFixed(0)}</span>
    </div>
  );
}

// ============================================================
// 경기 중 / 경기 후
// ============================================================
const EVENT_STYLE: Record<MatchEventType, string> = {
  goal: 'border-l-amber-400 bg-amber-400/10 text-amber-100 font-semibold',
  save: 'border-l-sky-400 bg-sky-500/5 text-sky-200',
  keyPass: 'border-l-violet-400 bg-violet-500/5 text-violet-200',
  shotOff: 'border-l-slate-600 text-slate-400',
  blocked: 'border-l-slate-500 text-slate-300',
  yellow: 'border-l-yellow-400 bg-yellow-400/5 text-yellow-200',
  red: 'border-l-rose-500 bg-rose-500/10 text-rose-200 font-semibold',
  info: 'border-l-emerald-600 text-emerald-300/80 italic',
  kickoff: 'border-l-emerald-400 text-emerald-200',
  halftime: 'border-l-slate-400 bg-slate-800/40 text-slate-200 font-semibold',
  fulltime: 'border-l-emerald-400 bg-emerald-500/10 text-emerald-100 font-semibold',
};

function LiveView({ live, go }: { live: LiveMatch; go: (p: PageId) => void }) {
  const togglePause = useGame((s) => s.togglePause);
  const setSpeed = useGame((s) => s.setMatchSpeed);
  const skip = useGame((s) => s.skipMatch);
  const close = useGame((s) => s.closeMatch);
  const r = live.result;
  const minute = live.finished ? 90 : live.minute;
  const snap = r.timeline[Math.min(minute, r.timeline.length - 1)];
  const visible: MatchEvent[] = useMemo(
    () => r.events.filter((e) => live.finished || e.minute <= minute).reverse(),
    [r.events, minute, live.finished],
  );
  const lastGoal = visible.find((e) => e.type === 'goal');

  return (
    <div className="space-y-5">
      {/* Scoreboard */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs">
          <span className="font-semibold text-slate-400">{live.kind === 'league' ? '리그 경기' : '친선 경기'}</span>
          {live.finished
            ? <span className="rounded bg-slate-700 px-2 py-0.5 font-bold text-slate-200">FULL TIME</span>
            : <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300"><Radio size={11} className="animate-pulse" />LIVE</span>}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-6">
          <div className="text-right">
            <div className="text-lg font-bold text-slate-100 sm:text-xl">{r.homeName}</div>
            <div className="mt-1 ml-auto h-1 w-16 rounded" style={{ background: r.homeColor }} />
          </div>
          <div className="text-center">
            <div key={`${snap.homeGoals}-${snap.awayGoals}`} className="tabular animate-pop-in text-5xl font-black text-slate-50">
              {snap.homeGoals}<span className="mx-2 text-slate-600">:</span>{snap.awayGoals}
            </div>
            <div className="tabular mt-1 text-sm font-bold text-emerald-300">{minute}'</div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100 sm:text-xl">{r.awayName}</div>
            <div className="mt-1 h-1 w-16 rounded" style={{ background: r.awayColor }} />
          </div>
        </div>
        <div className="h-1 bg-slate-800">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(minute / 90) * 100}%` }} />
        </div>
        {!live.finished && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
            <Btn variant="ghost" size="sm" onClick={togglePause}>{live.paused ? <Play size={14} /> : <Pause size={14} />}{live.paused ? '재개' : '일시정지'}</Btn>
            <Btn variant={live.speed === 1 && !live.paused ? 'primary' : 'outline'} size="sm" onClick={() => setSpeed(1)}><ChevronsRight size={14} />1배속</Btn>
            <Btn variant={live.speed === 4 && !live.paused ? 'primary' : 'outline'} size="sm" onClick={() => setSpeed(4)}><FastForward size={14} />4배속</Btn>
            <Btn variant="gold" size="sm" onClick={skip}>즉시 결과 보기</Btn>
          </div>
        )}
        {lastGoal && !live.finished && (
          <div className="border-t border-slate-800 bg-amber-400/5 px-4 py-2 text-center text-xs text-amber-200">최근 득점 {lastGoal.minute}' — {lastGoal.text.replace('⚽ 골!! ', '')}</div>
        )}
      </div>

      {live.finished && live.rewards && <PostMatch live={live} onClose={() => { close(); }} go={go} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="텍스트 중계" icon={<Radio size={16} />} bodyClass="p-0">
          <ul className="max-h-[520px] space-y-1 overflow-y-auto p-3">
            {visible.map((e, i) => (
              <li key={`${e.minute}-${i}-${e.type}`} className={cn('animate-slide-in flex gap-3 rounded-r border-l-2 px-3 py-1.5 text-sm', EVENT_STYLE[e.type])}>
                <span className="tabular w-8 shrink-0 text-right text-xs font-bold text-slate-500">{e.minute}'</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="경기 데이터" icon={<TrendingUp size={16} />}>
          <LiveStats home={snap.home} away={snap.away} homeStamina={snap.homeStamina} awayStamina={snap.awayStamina} homeColor={r.homeColor} awayColor={r.awayColor} />
        </Card>
      </div>
    </div>
  );
}

function LiveStats({ home, away, homeStamina, awayStamina, homeColor, awayColor }: {
  home: TeamMatchStats; away: TeamMatchStats; homeStamina: number; awayStamina: number; homeColor: string; awayColor: string;
}) {
  const pct = (s: TeamMatchStats) => (s.passes ? Math.round((s.passesCompleted / s.passes) * 100) : 0);
  const rows: [string, number | string, number | string, number, number][] = [
    ['슈팅', home.shots, away.shots, home.shots, away.shots],
    ['유효 슈팅', home.onTarget, away.onTarget, home.onTarget, away.onTarget],
    ['기대 득점 (xG)', home.xg.toFixed(2), away.xg.toFixed(2), home.xg, away.xg],
    ['패스', home.passes, away.passes, home.passes, away.passes],
    ['패스 성공률', `${pct(home)}%`, `${pct(away)}%`, pct(home), pct(away)],
    ['파울', home.fouls, away.fouls, home.fouls, away.fouls],
    ['경고 / 퇴장', `${home.yellows} / ${home.reds}`, `${away.yellows} / ${away.reds}`, home.yellows, away.yellows],
    ['평균 체력', homeStamina, awayStamina, homeStamina, awayStamina],
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex justify-between text-sm font-bold">
          <span className="tabular" style={{ color: homeColor }}>{home.possession}%</span>
          <span className="text-xs font-medium text-slate-400">점유율</span>
          <span className="tabular" style={{ color: awayColor }}>{away.possession}%</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full transition-all duration-500" style={{ width: `${home.possession}%`, background: homeColor }} />
          <div className="h-full flex-1 opacity-80" style={{ background: awayColor }} />
        </div>
      </div>
      {rows.map(([label, a, b, na, nb]) => {
        const total = na + nb || 1;
        return (
          <div key={label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={cn('tabular font-semibold', na > nb ? 'text-slate-100' : 'text-slate-400')}>{a}</span>
              <span className="text-xs text-slate-500">{label}</span>
              <span className={cn('tabular font-semibold', nb > na ? 'text-slate-100' : 'text-slate-400')}>{b}</span>
            </div>
            <div className="flex gap-1">
              <div className="flex h-1 flex-1 justify-end overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(na / total) * 100}%`, background: homeColor }} />
              </div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(nb / total) * 100}%`, background: awayColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ratingColor(r: number) {
  if (r >= 8.5) return 'bg-amber-400 text-slate-950';
  if (r >= 7.5) return 'bg-emerald-400 text-slate-950';
  if (r >= 6.8) return 'bg-sky-500/80 text-slate-950';
  return 'bg-slate-700 text-slate-200';
}

function RatingTable({ title, color, rows, mvpId }: { title: string; color: string; rows: PlayerMatchRating[]; mvpId: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{title}
      </div>
      <ul className="space-y-1">
        {rows.map((p) => (
          <li key={p.playerId} className={cn('flex items-center gap-2 rounded px-2 py-1 text-sm', p.playerId === mvpId && 'bg-amber-400/10 ring-1 ring-amber-400/40')}>
            <span className="w-9 text-[10px] font-bold text-slate-500">{p.position}</span>
            <span className="min-w-0 flex-1 truncate text-slate-200">
              {p.name}
              {p.playerId === mvpId && <Crown size={12} className="ml-1 inline text-amber-300" />}
            </span>
            <span className="text-xs text-slate-400">
              {'⚽'.repeat(p.goals)}{p.assists > 0 && <span className="text-violet-300"> A{p.assists}</span>}
              {p.saves > 0 && <span className="text-sky-300"> S{p.saves}</span>}
              {p.yellow > 0 && !p.red && <span className="text-yellow-300"> ▮</span>}
              {p.red && <span className="text-rose-400"> ▮</span>}
            </span>
            <span className={cn('tabular w-9 rounded py-0.5 text-center text-xs font-bold', ratingColor(p.rating))}>{p.rating.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PostMatch({ live, onClose, go }: { live: LiveMatch; onClose: () => void; go: (p: PageId) => void }) {
  const r = live.result;
  const rw = live.rewards!;
  const mvp = r.ratings.find((x) => x.playerId === r.mvpId);
  const userGoals = live.userSide === 'home' ? r.homeGoals : r.awayGoals;
  const oppGoals = live.userSide === 'home' ? r.awayGoals : r.homeGoals;
  const outcome = userGoals > oppGoals ? { t: '승리', c: 'text-emerald-300' } : userGoals === oppGoals ? { t: '무승부', c: 'text-slate-200' } : { t: '패배', c: 'text-rose-300' };
  const homeRows = r.ratings.filter((x) => x.side === 'home');
  const awayRows = r.ratings.filter((x) => x.side === 'away');

  return (
    <Card title="경기 결과 리포트" icon={<Award size={16} />}
      action={
        <div className="flex gap-2">
          {live.kind === 'league' && <Btn size="sm" variant="outline" onClick={() => { onClose(); go('league'); }}>순위표 보기</Btn>}
          <Btn size="sm" onClick={onClose}>확인<ArrowRight size={14} /></Btn>
        </div>
      }>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-slate-950/50 p-4">
          <div className="text-xs text-slate-500">결과</div>
          <div className={cn('text-2xl font-black', outcome.c)}>{outcome.t} {userGoals}-{oppGoals}</div>
          {mvp && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-400/10 p-2.5">
              <Crown size={18} className="text-amber-300" />
              <div>
                <div className="text-[10px] font-bold tracking-widest text-amber-300">MATCH MVP</div>
                <div className="text-sm font-semibold text-slate-100">{mvp.name} <span className="tabular text-amber-300">{mvp.rating.toFixed(1)}</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-slate-950/50 p-4">
          <div className="text-xs text-slate-500">획득 보상</div>
          <div className="mt-1 flex items-center gap-2 text-xl font-bold text-amber-300"><Coins size={18} />+{rw.gold.toLocaleString()} G</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-bold text-sky-300"><Dumbbell size={16} />+{rw.trainingPoints} TP</div>
        </div>
        <div className="rounded-lg bg-slate-950/50 p-4">
          <div className="text-xs text-slate-500">경험치 (선발 11명)</div>
          <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-xs">
            {rw.exp.map((e) => (
              <li key={e.playerId} className="flex justify-between">
                <span className="truncate text-slate-300">{e.name}{e.levelUp && <span className="ml-1 rounded bg-violet-500/30 px-1 text-[9px] font-bold text-violet-200">LEVEL UP</span>}</span>
                <span className="tabular text-violet-300">+{e.exp}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <RatingTable title={r.homeName} color={r.homeColor} rows={homeRows} mvpId={r.mvpId} />
        <RatingTable title={r.awayName} color={r.awayColor} rows={awayRows} mvpId={r.mvpId} />
      </div>
    </Card>
  );
}
