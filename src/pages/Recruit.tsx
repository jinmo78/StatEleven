import { useMemo, useState } from 'react';
import { Coins, Dumbbell, Gem, RefreshCw, Search, ShoppingCart, Sparkles, TrendingUp, UserX } from 'lucide-react';
import { Btn, Card, ConditionBar, PlayerCard, PosBadge, Segmented, StatBar, cn, notify } from '../components/ui';
import { expToNext, FOOT_LABEL, KEY_STATS, marketValue, overall, ovrColor, STAT_LABELS } from '../engine/ratings';
import {
  MARKET_REFRESH_COST, MAX_LEVEL, SCOUT_COST, SQUAD_MAX, STAT_MAX, trainCost, useGame, type ScoutTier,
} from '../store/gameStore';
import type { Player, Position } from '../types';
import { STAT_KEYS } from '../types';

type Tab = 'scout' | 'market' | 'train';

export default function Recruit() {
  const [tab, setTab] = useState<Tab>('scout');
  const gold = useGame((s) => s.gold);
  const tp = useGame((s) => s.trainingPoints);
  const squadSize = useGame((s) => s.squad.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Scouting & Development</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">선수 영입 & 육성</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="tabular flex items-center gap-1.5 text-amber-300"><Coins size={15} />{gold.toLocaleString()} G</span>
          <span className="tabular flex items-center gap-1.5 text-sky-300"><Dumbbell size={15} />{tp} TP</span>
          <span className="tabular text-slate-400">스쿼드 {squadSize}/{SQUAD_MAX}</span>
        </div>
      </div>
      <div className="max-w-md">
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'scout', label: '스카우트' }, { value: 'market', label: '이적시장' }, { value: 'train', label: '훈련 & 방출' },
        ]} />
      </div>
      {tab === 'scout' && <ScoutTab />}
      {tab === 'market' && <MarketTab />}
      {tab === 'train' && <TrainTab />}
    </div>
  );
}

// ---------------- 스카우트 ----------------
function ScoutTab() {
  const scout = useGame((s) => s.scout);
  const gold = useGame((s) => s.gold);
  const [results, setResults] = useState<Player[]>([]);

  const run = (tier: ScoutTier) => {
    const r = scout(tier);
    if (!r.ok) return notify(r.error);
    setResults((prev) => [r.player, ...prev].slice(0, 8));
    notify(null, `${r.player.name} (OVR ${overall(r.player)}) 영입!`);
  };

  const tiers: { tier: ScoutTier; title: string; desc: string; odds: string; icon: typeof Search; cls: string }[] = [
    { tier: 'normal', title: '일반 스카우트', desc: '지역 리그와 유스 무대를 탐색합니다.', odds: 'OVR 50~66 · 6% 확률로 68~74', icon: Search, cls: 'border-sky-500/30 from-sky-500/10' },
    { tier: 'premium', title: '고급 스카우트', desc: '해외 네트워크로 검증된 인재를 찾습니다. 젊은 선수 비중 ↑', odds: 'OVR 64~77 · 10% 확률로 78~85', icon: Gem, cls: 'border-amber-400/40 from-amber-500/10' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map(({ tier, title, desc, odds, icon: Icon, cls }) => (
          <div key={tier} className={cn('rounded-xl border bg-gradient-to-br to-slate-900/60 p-5', cls)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold text-slate-100"><Icon size={18} />{title}</div>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
                <p className="mt-2 text-xs font-medium text-slate-300">{odds}</p>
              </div>
              <div className="tabular text-right text-xl font-black text-amber-300">{SCOUT_COST[tier].toLocaleString()}<span className="text-xs"> G</span></div>
            </div>
            <Btn className="mt-4 w-full" variant={tier === 'premium' ? 'gold' : 'primary'} disabled={gold < SCOUT_COST[tier]} onClick={() => run(tier)}>
              <Sparkles size={15} />스카우트 실행
            </Btn>
          </div>
        ))}
      </div>
      {results.length > 0 && (
        <Card title="이번 세션 영입 결과" icon={<Sparkles size={16} />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p, i) => <PlayerCard key={p.id} p={p} animate={i === 0} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------- 이적시장 ----------------
function MarketTab() {
  const market = useGame((s) => s.market);
  const gold = useGame((s) => s.gold);
  const buy = useGame((s) => s.buyPlayer);
  const refresh = useGame((s) => s.refreshMarket);

  return (
    <Card
      title="이적시장 매물"
      icon={<ShoppingCart size={16} />}
      action={
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">리그 경기 후 자동 갱신</span>
          <Btn size="sm" variant="outline" onClick={() => notify(refresh(), '이적시장 목록을 갱신했습니다.')}>
            <RefreshCw size={13} />갱신 ({MARKET_REFRESH_COST}G)
          </Btn>
        </div>
      }
    >
      {market.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">모든 매물이 판매되었습니다. 목록을 갱신하세요.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {market.map(({ player, price }) => (
            <PlayerCard key={player.id} p={player} footer={
              <Btn className="w-full" variant="gold" size="sm" disabled={gold < price}
                onClick={() => notify(buy(player.id), `${player.name} 영입 완료!`)}>
                <Coins size={13} />{price.toLocaleString()} G 에 영입
              </Btn>
            } />
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------- 훈련 & 방출 ----------------
function TrainTab() {
  const squad = useGame((s) => s.squad);
  const lineup = useGame((s) => s.lineup);
  const gold = useGame((s) => s.gold);
  const tp = useGame((s) => s.trainingPoints);
  const train = useGame((s) => s.trainStat);
  const sell = useGame((s) => s.sellPlayer);
  const [selId, setSelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');

  const list = useMemo(() => {
    const order: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };
    return [...squad]
      .filter((p) => filter === 'ALL' || p.position === filter)
      .sort((a, b) => order[a.position] - order[b.position] || overall(b) - overall(a));
  }, [squad, filter]);
  const sel = squad.find((p) => p.id === selId) ?? list[0] ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card title="선수 선택" icon={<TrendingUp size={16} />} bodyClass="p-0"
        action={<Segmented size="sm" value={filter} onChange={setFilter}
          options={[{ value: 'ALL', label: '전체' }, { value: 'GK', label: 'GK' }, { value: 'DF', label: 'DF' }, { value: 'MF', label: 'MF' }, { value: 'FW', label: 'FW' }]} />}>
        <ul className="max-h-[560px] overflow-y-auto">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSelId(p.id)}
                className={cn('flex w-full items-center gap-3 border-b border-slate-800/60 px-4 py-2.5 text-left transition-colors hover:bg-slate-800/40',
                  sel?.id === p.id && 'bg-emerald-500/10')}>
                <PosBadge pos={p.position} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{p.name}</span>
                {lineup.includes(p.id) && <span className="text-[10px] font-bold text-emerald-400">선발</span>}
                <span className="text-xs text-slate-500">Lv.{p.level}</span>
                <span className={cn('tabular w-7 text-right font-bold', ovrColor(overall(p)))}>{overall(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {sel && (
        <Card title="능력치 강화" icon={<Dumbbell size={16} />}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <PosBadge pos={sel.position} />
                <span className="text-xl font-bold text-slate-100">{sel.name}</span>
              </div>
              <div className="mt-1 text-sm text-slate-400">{sel.age}세 · {FOOT_LABEL[sel.foot]} · 시장가치 {marketValue(sel).toLocaleString()} G</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                컨디션 <ConditionBar value={sel.condition} />
              </div>
            </div>
            <div className="text-right">
              <div className={cn('tabular text-4xl font-black', ovrColor(overall(sel)))}>{overall(sel)}</div>
              <div className="text-[11px] text-slate-500">OVR</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-950/50 p-3">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Lv.{sel.level}{sel.level >= MAX_LEVEL && ' (MAX)'}</span>
              <span className="tabular text-slate-500">EXP {sel.exp} / {expToNext(sel.level)}</span>
            </div>
            <StatBar value={sel.exp} max={expToNext(sel.level)} color="bg-violet-400" />
            <div className="mt-1.5 text-[11px] text-slate-500">레벨업 시 핵심 능력치 자동 성장 + 팀 훈련 포인트 1 획득</div>
          </div>

          <div className="mt-4 space-y-2">
            {STAT_KEYS.map((k) => {
              const v = sel.stats[k];
              const cost = trainCost(v);
              const isKey = KEY_STATS[sel.position].includes(k);
              const maxed = v >= STAT_MAX;
              return (
                <div key={k} className="grid grid-cols-[84px_1fr_32px_auto] items-center gap-3">
                  <span className={cn('text-sm', isKey ? 'font-semibold text-emerald-300' : 'text-slate-400')}>
                    {STAT_LABELS[k]}{isKey && <span className="ml-0.5 text-[10px]">★</span>}
                  </span>
                  <StatBar value={v} />
                  <span className="tabular text-right text-sm font-bold text-slate-100">{v}</span>
                  <div className="flex gap-1.5">
                    <Btn size="sm" variant="ghost" disabled={maxed || tp < cost.tp}
                      onClick={() => notify(train(sel.id, k, 'tp'))} title="훈련 포인트로 강화">
                      +1 <span className="text-sky-300">{cost.tp}TP</span>
                    </Btn>
                    <Btn size="sm" variant="ghost" disabled={maxed || gold < cost.gold}
                      onClick={() => notify(train(sel.id, k, 'gold'))} title="골드로 강화">
                      +1 <span className="tabular text-amber-300">{cost.gold}G</span>
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">★ 포지션 핵심 능력치 — OVR 상승 효과가 큽니다. 능력치 80 이상은 TP 2 소모, 골드 비용은 능력치가 높을수록 증가합니다.</p>

          <div className="mt-5 flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="text-xs text-slate-400">
              방출 시 시장가치의 60% 획득: <b className="tabular text-amber-300">{Math.round(marketValue(sel) * 0.6).toLocaleString()} G</b>
            </div>
            <Btn size="sm" variant="danger" onClick={() => {
              if (!confirm(`${sel.name} 선수를 방출할까요?`)) return;
              const err = sell(sel.id);
              notify(err, `${sel.name} 방출 완료`);
              if (!err) setSelId(null);
            }}>
              <UserX size={13} />방출
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
