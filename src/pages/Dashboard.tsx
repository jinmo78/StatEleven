import { useMemo } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, CalendarDays, Coins, Dumbbell, History, RotateCcw, Shield, Trophy, Users,
} from 'lucide-react';
import type { PageId } from '../App';
import { Btn, Card, ConditionBar, Kpi, PosBadge, ResultChip, Stars, StatBar } from '../components/ui';
import { computeTeamProfile } from '../engine/matchEngine';
import { overall, ovrColor } from '../engine/ratings';
import { sortTable } from '../engine/league';
import { nextLeagueFixture, teamName, useGame, userLineupPlayers } from '../store/gameStore';
import { USER_TEAM_ID } from '../types';

export default function Dashboard({ go }: { go: (p: PageId) => void }) {
  const st = useGame();
  const lineupPlayers = useMemo(() => userLineupPlayers(st), [st.squad, st.lineup]);
  const profile = useMemo(() => computeTeamProfile(lineupPlayers, st.formation), [lineupPlayers, st.formation]);
  const table = useMemo(() => sortTable(st.league.table), [st.league.table]);
  const rank = table.findIndex((t) => t.teamId === USER_TEAM_ID) + 1;
  const myRow = table[rank - 1];
  const fx = nextLeagueFixture(st);
  const oppId = fx ? (fx.home === USER_TEAM_ID ? fx.away : fx.home) : null;
  const opp = st.aiTeams.find((t) => t.id === oppId);
  const oppProfile = useMemo(() => (opp ? computeTeamProfile(opp.players, opp.formation) : null), [opp]);

  const topPlayers = useMemo(() => [...st.squad].sort((a, b) => overall(b) - overall(a)).slice(0, 5), [st.squad]);
  const tired = useMemo(() => st.squad.filter((p) => p.condition < 65 && st.lineup.includes(p.id)), [st.squad, st.lineup]);

  const units: [string, number, number | undefined][] = [
    ['공격', profile.attack, oppProfile?.attack],
    ['중원', profile.midfield, oppProfile?.midfield],
    ['수비', profile.defense, oppProfile?.defense],
    ['골키퍼', profile.goalkeeper, oppProfile?.goalkeeper],
    ['스피드', profile.pace, oppProfile?.pace],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Club Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">{st.clubName}</h1>
          <p className="text-sm text-slate-500">시즌 {st.league.season} · {st.formation} · 스쿼드 {st.squad.length}명</p>
        </div>
        <Btn onClick={() => go('match')} size="lg"><ArrowRight size={18} />경기 시작하기</Btn>
      </div>

      {st.seasonSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-300" />
            <div>
              <div className="font-semibold text-amber-200">시즌 {st.seasonSummary.season} 종료 — 최종 {st.seasonSummary.rank}위</div>
              <div className="text-sm text-amber-200/70">시즌 상금 {st.seasonSummary.prize.toLocaleString()} G 지급 완료</div>
            </div>
          </div>
          <Btn variant="gold" onClick={() => go('league')}>리그에서 새 시즌 시작</Btn>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="보유 골드" value={st.gold.toLocaleString()} sub="경기 보상 · 선수 판매로 획득" icon={<Coins size={16} />} accent="text-amber-300" />
        <Kpi label="훈련 포인트" value={st.trainingPoints} sub="경기 · 레벨업 시 획득" icon={<Dumbbell size={16} />} accent="text-sky-300" />
        <Kpi label="리그 순위" value={`${rank}위`} sub={myRow ? `${myRow.points}점 · ${myRow.won}승 ${myRow.drawn}무 ${myRow.lost}패` : ''} icon={<Trophy size={16} />} />
        <Kpi label="팀 전력" value={profile.overall.toFixed(1)} sub="선발 11명 · 포지션 적합도 · 컨디션 반영" icon={<Activity size={16} />} accent={ovrColor(profile.overall)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="다음 리그 경기" icon={<CalendarDays size={16} />} className="lg:col-span-2">
          {opp && fx ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{fx.home === USER_TEAM_ID ? 'HOME' : 'AWAY'}</div>
                    <div className="text-lg font-bold text-emerald-300">{st.clubShort}</div>
                  </div>
                  <span className="text-slate-600">vs</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: opp.color }} />
                      <span className="text-lg font-bold text-slate-100">{opp.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <Stars n={opp.difficulty} /> {opp.formation} · {opp.styleNote}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">라운드 {st.league.round + 1} / {st.league.fixtures.length}</div>
              </div>
              <div className="space-y-2.5">
                {units.map(([label, mine, theirs]) => (
                  <div key={label} className="grid grid-cols-[56px_1fr_40px_1fr_40px] items-center gap-2 text-xs">
                    <span className="text-slate-400">{label}</span>
                    <StatBar value={mine} color="bg-emerald-400" />
                    <span className="tabular text-right font-semibold text-emerald-300">{mine.toFixed(0)}</span>
                    <StatBar value={theirs ?? 0} color="bg-rose-400" />
                    <span className="tabular text-right font-semibold text-rose-300">{theirs?.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-slate-500">이번 시즌 리그 일정이 모두 끝났습니다. 친선 경기를 치르거나 새 시즌을 시작하세요.</div>
          )}
        </Card>

        <Card title="최근 경기" icon={<History size={16} />}>
          {st.history.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">아직 치른 경기가 없습니다.</div>
          ) : (
            <ul className="space-y-2">
              {st.history.slice(0, 6).map((h, i) => {
                const r = h.goalsFor > h.goalsAgainst ? 'W' : h.goalsFor === h.goalsAgainst ? 'D' : 'L';
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ResultChip r={r} />
                    <span className="tabular w-10 font-semibold text-slate-200">{h.goalsFor}-{h.goalsAgainst}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-400">{h.userSide === 'home' ? 'vs' : '@'} {h.opponentName}</span>
                    <span className="text-[10px] text-slate-600">{h.kind === 'league' ? '리그' : '친선'}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="핵심 선수 TOP 5" icon={<Users size={16} />} className="lg:col-span-2" bodyClass="p-0">
          <table className="w-full text-sm">
            <tbody>
              {topPlayers.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2.5 pl-4"><PosBadge pos={p.position} /></td>
                  <td className="py-2.5 font-medium text-slate-200">{p.name}</td>
                  <td className="py-2.5 text-xs text-slate-500">{p.age}세 · Lv.{p.level}</td>
                  <td className="py-2.5"><ConditionBar value={p.condition} /></td>
                  <td className={`tabular py-2.5 pr-4 text-right text-lg font-bold ${ovrColor(overall(p))}`}>{overall(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="스쿼드 알림" icon={<Shield size={16} />}>
          <div className="space-y-3 text-sm">
            {lineupPlayers.some((p) => !p) && (
              <div className="flex gap-2 rounded-lg bg-rose-500/10 p-3 text-rose-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />선발 라인업에 빈 자리가 있습니다.
              </div>
            )}
            {tired.length > 0 ? (
              <div className="rounded-lg bg-amber-500/10 p-3 text-amber-200">
                <div className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={15} />컨디션 저하 선발 선수</div>
                <div className="text-xs text-amber-200/80">{tired.map((p) => `${p.name}(${p.condition})`).join(', ')}</div>
                <div className="mt-1 text-xs text-amber-200/60">로테이션하거나 스쿼드 화면에서 팀 휴식을 진행하세요.</div>
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-200">선발진 컨디션 양호</div>
            )}
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" onClick={() => go('squad')}>전술 설정</Btn>
              <Btn variant="outline" size="sm" onClick={() => go('recruit')}>선수 영입</Btn>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Btn
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm('저장된 진행 상황을 모두 지우고 새 게임을 시작할까요?')) st.resetGame();
          }}
        >
          <RotateCcw size={14} />새 게임 (초기화)
        </Btn>
      </div>
      <p className="text-center text-[11px] text-slate-600">{teamName(st, USER_TEAM_ID)} · Stat Eleven v0.1</p>
    </div>
  );
}
