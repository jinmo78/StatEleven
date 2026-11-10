import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Info, Trophy } from 'lucide-react';
import type { PageId } from '../App';
import { Btn, Card, ResultChip, Stars, cn } from '../components/ui';
import { computeTeamProfile } from '../engine/matchEngine';
import { seasonPrize, sortTable } from '../engine/league';
import { teamName, USER_COLOR, useGame, userLineupPlayers } from '../store/gameStore';
import { USER_TEAM_ID } from '../types';

export default function League({ go }: { go: (p: PageId) => void }) {
  const st = useGame();
  const table = useMemo(() => sortTable(st.league.table), [st.league.table]);
  const total = st.league.fixtures.length;
  const lastPlayed = Math.max(0, Math.min(st.league.round, total) - 1);
  const [viewRound, setViewRound] = useState(Math.min(st.league.round, total - 1));
  const round = st.league.fixtures[viewRound] ?? [];
  const seasonOver = st.league.round >= total;
  const userProfile = useMemo(() => computeTeamProfile(userLineupPlayers(st), st.formation), [st.squad, st.lineup, st.formation]);

  const colorOf = (id: string) => (id === USER_TEAM_ID ? USER_COLOR : st.aiTeams.find((t) => t.id === id)?.color ?? '#64748b');
  const shortOf = (id: string) => (id === USER_TEAM_ID ? st.clubShort : st.aiTeams.find((t) => t.id === id)?.short ?? id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">League Standings</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">리그 순위 · 시즌 {st.league.season}</h1>
          <p className="text-sm text-slate-500">10개 팀 더블 라운드로빈 · {Math.min(st.league.round, total)}/{total} 라운드 진행</p>
        </div>
        {!seasonOver && <Btn onClick={() => go('match')}>다음 경기 진행</Btn>}
      </div>

      {seasonOver && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-300" />
            <div>
              <div className="font-semibold text-amber-200">
                시즌 {st.league.season} 종료 — {st.clubName} 최종 {st.seasonSummary?.rank ?? '-'}위
              </div>
              <div className="text-sm text-amber-200/70">
                상금 {st.seasonSummary?.prize.toLocaleString() ?? 0} G 지급 완료 · 새 시즌에는 AI 팀이 성장/노화하고 선수들의 나이가 1살 늘어납니다.
              </div>
            </div>
          </div>
          <Btn variant="gold" onClick={() => { st.startNewSeason(); setViewRound(0); }}>새 시즌 시작</Btn>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="순위표" icon={<Trophy size={16} />} bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pl-4 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">팀</th>
                  <th className="py-2 text-center font-medium">경기</th>
                  <th className="py-2 text-center font-medium">승</th>
                  <th className="py-2 text-center font-medium">무</th>
                  <th className="py-2 text-center font-medium">패</th>
                  <th className="py-2 text-center font-medium">득실</th>
                  <th className="py-2 text-center font-medium">승점</th>
                  <th className="py-2 pr-4 text-left font-medium">최근 5경기</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => {
                  const isUser = row.teamId === USER_TEAM_ID;
                  const ai = st.aiTeams.find((t) => t.id === row.teamId);
                  const gd = row.gf - row.ga;
                  return (
                    <tr key={row.teamId} className={cn('border-b border-slate-800/60', isUser && 'bg-emerald-500/10')}>
                      <td className="py-2.5 pl-4">
                        <span className={cn('tabular inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold',
                          i === 0 ? 'bg-amber-400/20 text-amber-300' : i < 3 ? 'bg-emerald-500/15 text-emerald-300' : i >= table.length - 2 ? 'bg-rose-500/15 text-rose-300' : 'text-slate-400')}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(row.teamId) }} />
                          <span className={cn('font-medium', isUser ? 'text-emerald-200' : 'text-slate-200')}>{teamName(st, row.teamId)}</span>
                          {ai && <span className="hidden sm:inline"><Stars n={ai.difficulty} /></span>}
                        </div>
                      </td>
                      <td className="tabular py-2.5 text-center text-slate-400">{row.played}</td>
                      <td className="tabular py-2.5 text-center text-slate-300">{row.won}</td>
                      <td className="tabular py-2.5 text-center text-slate-300">{row.drawn}</td>
                      <td className="tabular py-2.5 text-center text-slate-300">{row.lost}</td>
                      <td className={cn('tabular py-2.5 text-center', gd > 0 ? 'text-emerald-300' : gd < 0 ? 'text-rose-300' : 'text-slate-400')}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>
                      <td className="tabular py-2.5 text-center text-base font-bold text-slate-100">{row.points}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex gap-1">{row.form.map((f, k) => <ResultChip key={k} r={f} />)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-3 text-[11px] text-slate-500">
            <span>🥇 우승 상금 {seasonPrize(1).toLocaleString()}G</span>
            <span>2위 {seasonPrize(2).toLocaleString()}G</span>
            <span>3위 {seasonPrize(3).toLocaleString()}G</span>
            <span>4위 이하 {seasonPrize(10).toLocaleString()}~{seasonPrize(4).toLocaleString()}G</span>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={`라운드 ${viewRound + 1} 일정`} icon={<CalendarDays size={16} />}
            action={
              <div className="flex gap-1">
                <Btn size="sm" variant="ghost" disabled={viewRound <= 0} onClick={() => setViewRound(viewRound - 1)}><ChevronLeft size={14} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => setViewRound(Math.min(lastPlayed + 1, total - 1))}>현재</Btn>
                <Btn size="sm" variant="ghost" disabled={viewRound >= total - 1} onClick={() => setViewRound(viewRound + 1)}><ChevronRight size={14} /></Btn>
              </div>
            }>
            <ul className="space-y-1.5">
              {round.map((f, i) => {
                const mine = f.home === USER_TEAM_ID || f.away === USER_TEAM_ID;
                return (
                  <li key={i} className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-3 py-2 text-sm', mine ? 'bg-emerald-500/10' : 'bg-slate-950/40')}>
                    <span className="flex items-center justify-end gap-1.5 truncate text-right text-slate-200">
                      {shortOf(f.home)}<span className="h-2 w-2 rounded-full" style={{ background: colorOf(f.home) }} />
                    </span>
                    <span className="tabular w-14 text-center font-bold text-slate-100">
                      {f.played ? `${f.homeGoals} - ${f.awayGoals}` : <span className="text-xs font-normal text-slate-500">vs</span>}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-slate-200">
                      <span className="h-2 w-2 rounded-full" style={{ background: colorOf(f.away) }} />{shortOf(f.away)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="참가 팀 정보" icon={<Info size={16} />} bodyClass="p-0">
            <ul className="max-h-[360px] overflow-y-auto">
              <li className="flex items-center gap-2 border-b border-slate-800/60 px-4 py-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: USER_COLOR }} />
                <span className="flex-1 font-semibold text-emerald-200">{st.clubName}</span>
                <span className="text-slate-500">{st.formation}</span>
                <span className="tabular w-10 text-right font-bold text-slate-300">{userProfile.overall.toFixed(1)}</span>
              </li>
              {st.aiTeams.map((t) => (
                <li key={t.id} className="flex items-center gap-2 border-b border-slate-800/60 px-4 py-2 text-xs last:border-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200">{t.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{t.styleNote}</div>
                  </div>
                  <span className="text-slate-500">{t.formation}</span>
                  <span className="tabular w-10 text-right font-bold text-slate-300">{computeTeamProfile(t.players, t.formation).overall.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
