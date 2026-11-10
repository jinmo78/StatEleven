import { useEffect, useState } from 'react';
import { Coins, Dumbbell, LayoutDashboard, PlayCircle, Radio, Trophy, UserPlus, Users } from 'lucide-react';
import { Toast, cn } from './components/ui';
import { CloudConflictModal, CloudMini, CloudPanel } from './components/CloudSync';
import { initCloud } from './store/cloudStore';
import { useGame } from './store/gameStore';
import Dashboard from './pages/Dashboard';
import SquadTactics from './pages/SquadTactics';
import Recruit from './pages/Recruit';
import MatchSim from './pages/MatchSim';
import League from './pages/League';

export type PageId = 'dashboard' | 'squad' | 'recruit' | 'match' | 'league';

const NAV: { id: PageId; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'squad', label: '스쿼드 & 전술', icon: Users },
  { id: 'recruit', label: '선수 영입 & 육성', icon: UserPlus },
  { id: 'match', label: '경기 시뮬레이션', icon: PlayCircle },
  { id: 'league', label: '리그 순위', icon: Trophy },
];

/** 경기 재생 타이머: 페이지를 이동해도 경기는 계속 진행된다 */
function useMatchTicker() {
  const live = useGame((s) => s.liveMatch);
  const tick = useGame((s) => s.tickMatch);
  const running = !!live && !live.finished && !live.paused;
  const speed = live?.speed ?? 1;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, speed === 4 ? 160 : 650);
    return () => clearInterval(id);
  }, [running, speed, tick]);
}

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const gold = useGame((s) => s.gold);
  const tp = useGame((s) => s.trainingPoints);
  const league = useGame((s) => s.league);
  const live = useGame((s) => s.liveMatch);
  useMatchTicker();
  useEffect(() => initCloud(), []);

  const liveBadge = live && !live.finished;

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Sidebar (desktop) / Topbar (mobile) */}
      <aside className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-slate-800 bg-slate-950/95 backdrop-blur md:h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 font-black text-emerald-400 ring-1 ring-emerald-500/30">11</div>
            <div>
              <div className="text-sm font-black tracking-[0.2em] text-slate-100">STAT ELEVEN</div>
              <div className="text-[10px] font-medium tracking-wider text-slate-500">FOOTBALL MANAGER · MVP</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs md:hidden">
            <CloudMini />
            <span className="tabular flex items-center gap-1 text-amber-300"><Coins size={13} />{gold.toLocaleString()}</span>
            <span className="tabular flex items-center gap-1 text-sky-300"><Dumbbell size={13} />{tp}</span>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-0">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:py-2.5',
                page === id ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
              )}
            >
              <Icon size={17} />
              <span className="whitespace-nowrap">{label}</span>
              {id === 'match' && liveBadge && (
                <span className="ml-auto flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                  <Radio size={10} className="animate-pulse" />LIVE
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-2 border-t border-slate-800 p-4 md:block">
          <CloudPanel />
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><Coins size={14} className="text-amber-400" />골드</span>
            <span className="tabular text-sm font-bold text-amber-300">{gold.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><Dumbbell size={14} className="text-sky-400" />훈련 포인트</span>
            <span className="tabular text-sm font-bold text-sky-300">{tp}</span>
          </div>
          <div className="px-1 pt-1 text-[11px] text-slate-500">
            시즌 {league.season} · 라운드 {Math.min(league.round + 1, league.fixtures.length)}/{league.fixtures.length}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto max-w-7xl">
          {page === 'dashboard' && <Dashboard go={setPage} />}
          {page === 'squad' && <SquadTactics />}
          {page === 'recruit' && <Recruit />}
          {page === 'match' && <MatchSim go={setPage} />}
          {page === 'league' && <League go={setPage} />}
        </div>
      </main>
      <Toast />
      <CloudConflictModal />
    </div>
  );
}
