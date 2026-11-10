import { useMemo, useState } from 'react';
import { BatteryCharging, Crosshair, LayoutGrid, Sparkles, UserMinus, Users, Wand2 } from 'lucide-react';
import { Btn, Card, ConditionBar, PosBadge, Segmented, StatBar, cn, notify } from '../components/ui';
import { FORMATION_IDS, FORMATION_NOTES, FORMATIONS } from '../data/formations';
import { computeTeamProfile } from '../engine/matchEngine';
import { FOOT_LABEL, overall, ovrColor, positionFit, ratingAtRole, STAT_SHORT } from '../engine/ratings';
import { REST_COST, useGame, userLineupPlayers } from '../store/gameStore';
import type { BuildUpStyle, DefensiveLine, Player, Position, PressingLevel, Tactics, Tempo } from '../types';
import { STAT_KEYS } from '../types';

const TACTIC_DEFS: {
  key: keyof Tactics; label: string;
  options: { value: string; label: string; hint: string }[];
}[] = [
  { key: 'pressing', label: '압박 강도', options: [
    { value: 'low', label: '낮음', hint: '수비 안정 ↑ · 체력 소모 ↓ · 점유 ↓' },
    { value: 'medium', label: '보통', hint: '균형' },
    { value: 'high', label: '강한 전방 압박', hint: '점유 ↑ · 짧은 빌드업 상대로 찬스 ↑ · 체력 소모 ↑↑ · 파울 ↑' },
  ] },
  { key: 'buildUp', label: '빌드업 스타일', options: [
    { value: 'short', label: '짧은 패스', hint: '점유 ↑ · 패스 성공률 ↑ · 강한 압박에 취약' },
    { value: 'balanced', label: '밸런스', hint: '균형' },
    { value: 'long', label: '롱볼 역습', hint: '높은 라인 상대로 결정력 ↑ · 점유/패스 성공률 ↓' },
  ] },
  { key: 'tempo', label: '공격 템포', options: [
    { value: 'slow', label: '느림', hint: '점유 ↑ · 패스 정확도 ↑ · 찬스 빈도 ↓' },
    { value: 'normal', label: '보통', hint: '균형' },
    { value: 'fast', label: '빠름', hint: '찬스 빈도 ↑ · 패스 정확도 ↓ · 체력 소모 ↑' },
  ] },
  { key: 'defLine', label: '수비 라인 높이', options: [
    { value: 'low', label: '낮음', hint: '수비 ↑ · 롱볼 흡수 · 공격력 ↓' },
    { value: 'medium', label: '보통', hint: '균형' },
    { value: 'high', label: '높음', hint: '공격 지원 ↑ · 롱볼/빠른 공격수에 취약' },
  ] },
];

function fitRing(fit: number) {
  if (fit >= 1) return 'ring-emerald-400';
  if (fit >= 0.85) return 'ring-amber-400';
  if (fit >= 0.7) return 'ring-orange-500';
  return 'ring-rose-500';
}

export default function SquadTactics() {
  const st = useGame();
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [filter, setFilter] = useState<Position | 'ALL'>('ALL');
  const slots = FORMATIONS[st.formation];
  const lineupPlayers = useMemo(() => userLineupPlayers(st), [st.squad, st.lineup]);
  const profile = useMemo(() => computeTeamProfile(lineupPlayers, st.formation), [lineupPlayers, st.formation]);

  const sorted = useMemo(() => {
    const order: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };
    return [...st.squad]
      .filter((p) => filter === 'ALL' || p.position === filter)
      .sort((a, b) => order[a.position] - order[b.position] || overall(b) - overall(a));
  }, [st.squad, filter]);

  const selRole = selSlot !== null ? slots[selSlot].role : null;

  const onRowClick = (p: Player) => {
    if (selSlot === null) {
      // 슬롯 미선택 상태에서 선발 선수를 클릭하면 해당 슬롯 선택
      const idx = st.lineup.indexOf(p.id);
      if (idx >= 0) setSelSlot(idx);
      return;
    }
    st.assignSlot(selSlot, p.id);
    setSelSlot(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Tactics Board</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">스쿼드 & 전술</h1>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => { st.autoLineup(); setSelSlot(null); notify(null, '최적 라인업으로 자동 배치했습니다.'); }}>
            <Wand2 size={15} />자동 배치
          </Btn>
          <Btn variant="ghost" onClick={() => notify(st.restSquad(), `팀 휴식 완료! 전원 컨디션 +25 (-${REST_COST}G)`)}>
            <BatteryCharging size={15} />팀 휴식 ({REST_COST}G)
          </Btn>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Pitch */}
        <Card title={`포메이션 ${st.formation}`} icon={<LayoutGrid size={16} />}
          action={<span className="text-xs text-slate-500">슬롯 클릭 → 아래 목록에서 선수 선택</span>}>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-lg border border-emerald-900/50 bg-gradient-to-b from-emerald-950 via-emerald-900/70 to-emerald-950">
            {/* 피치 라인 */}
            <div className="absolute inset-3 rounded border border-emerald-500/20" />
            <div className="absolute inset-x-3 top-1/2 border-t border-emerald-500/20" />
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20" />
            <div className="absolute left-1/2 top-3 h-[14%] w-[44%] -translate-x-1/2 border border-t-0 border-emerald-500/20" />
            <div className="absolute bottom-3 left-1/2 h-[14%] w-[44%] -translate-x-1/2 border border-b-0 border-emerald-500/20" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className={cn('absolute inset-x-3', i % 2 ? 'bg-emerald-400/[0.03]' : '')} style={{ top: `${3 + i * 15.6}%`, height: '15.6%' }} />
            ))}

            {slots.map((slot, i) => {
              const p = lineupPlayers[i];
              const fit = p ? positionFit(p.position, slot.role) : 0;
              const eff = p ? Math.round(ratingAtRole(p, slot.role)) : 0;
              const selected = selSlot === i;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelSlot(selected ? null : i)}
                  className="group absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                >
                  <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ring-2 transition-transform group-hover:scale-110',
                    p ? `bg-slate-950/90 ${fitRing(fit)} ${ovrColor(eff)}` : 'bg-slate-950/50 text-slate-500 ring-slate-600 ring-dashed',
                    selected && 'scale-110 ring-4 ring-white',
                  )}>
                    {p ? eff : '+'}
                  </div>
                  <div className="mt-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{slot.label}</div>
                  <div className="max-w-full truncate text-[11px] font-semibold text-slate-100 drop-shadow">{p?.name ?? '비어 있음'}</div>
                  {p && p.condition < 65 && <div className="text-[9px] font-bold text-rose-300">컨디션 {p.condition}</div>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />적합 100%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />인접 85%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />부적합 70%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />GK 전환 45%</span>
          </div>
          {selSlot !== null && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <span><b>{slots[selSlot].label}</b> 슬롯 선택됨 — 아래 목록에서 선수를 클릭하세요.</span>
              <Btn size="sm" variant="danger" onClick={() => { st.assignSlot(selSlot, null); setSelSlot(null); }}>
                <UserMinus size={13} />비우기
              </Btn>
            </div>
          )}
        </Card>

        {/* Tactics */}
        <div className="space-y-5">
          <Card title="포메이션" icon={<LayoutGrid size={16} />}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FORMATION_IDS.map((f) => (
                <button key={f} type="button" onClick={() => { st.setFormation(f); setSelSlot(null); }}
                  className={cn('rounded-lg border px-3 py-2 text-left transition-colors',
                    st.formation === f ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 hover:border-slate-600')}>
                  <div className={cn('font-bold', st.formation === f ? 'text-emerald-300' : 'text-slate-200')}>{f}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-slate-500">{FORMATION_NOTES[f]}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="팀 전술 파라미터" icon={<Crosshair size={16} />}>
            <div className="space-y-4">
              {TACTIC_DEFS.map((d) => {
                const cur = d.options.find((o) => o.value === st.tactics[d.key]);
                return (
                  <div key={d.key}>
                    <div className="mb-1.5 text-xs font-semibold text-slate-400">{d.label}</div>
                    <Segmented
                      size="sm"
                      options={d.options}
                      value={st.tactics[d.key]}
                      onChange={(v) => {
                        // 각 키의 유니온 타입으로 안전하게 전달
                        if (d.key === 'pressing') st.setTactic('pressing', v as PressingLevel);
                        if (d.key === 'buildUp') st.setTactic('buildUp', v as BuildUpStyle);
                        if (d.key === 'tempo') st.setTactic('tempo', v as Tempo);
                        if (d.key === 'defLine') st.setTactic('defLine', v as DefensiveLine);
                      }}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">{cur?.hint}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="유닛별 전력" icon={<Sparkles size={16} />}>
            <div className="space-y-2.5">
              {([['공격', profile.attack], ['중원', profile.midfield], ['수비', profile.defense], ['골키퍼', profile.goalkeeper], ['스피드', profile.pace]] as [string, number][]).map(([l, v]) => (
                <div key={l} className="grid grid-cols-[56px_1fr_36px] items-center gap-3 text-xs">
                  <span className="text-slate-400">{l}</span>
                  <StatBar value={v} />
                  <span className={cn('tabular text-right font-bold', ovrColor(v))}>{v.toFixed(0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 text-sm">
                <span className="text-slate-400">종합 전력</span>
                <span className={cn('tabular text-lg font-black', ovrColor(profile.overall))}>{profile.overall.toFixed(1)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Squad list */}
      <Card
        title={`스쿼드 (${st.squad.length}명)`}
        icon={<Users size={16} />}
        bodyClass="p-0"
        action={
          <Segmented size="sm" value={filter} onChange={setFilter}
            options={[{ value: 'ALL', label: '전체' }, { value: 'GK', label: 'GK' }, { value: 'DF', label: 'DF' }, { value: 'MF', label: 'MF' }, { value: 'FW', label: 'FW' }]} />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-2 pl-4 text-left font-medium">Pos</th>
                <th className="py-2 text-left font-medium">이름</th>
                <th className="py-2 text-center font-medium">나이</th>
                <th className="py-2 text-center font-medium">주발</th>
                <th className="py-2 text-center font-medium">OVR</th>
                {selRole && <th className="py-2 text-center font-medium text-emerald-400">{selRole} 적용</th>}
                {STAT_KEYS.map((k) => <th key={k} className="py-2 text-center font-medium">{STAT_SHORT[k]}</th>)}
                <th className="py-2 text-left font-medium">컨디션</th>
                <th className="py-2 text-center font-medium">Lv</th>
                <th className="py-2 pr-4 text-right font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const slotIdx = st.lineup.indexOf(p.id);
                const ovr = overall(p);
                const roleRating = selRole ? Math.round(ratingAtRole(p, selRole)) : 0;
                return (
                  <tr key={p.id} onClick={() => onRowClick(p)}
                    className={cn('cursor-pointer border-b border-slate-800/60 transition-colors hover:bg-slate-800/40',
                      slotIdx >= 0 && 'bg-emerald-500/[0.04]', selSlot !== null && slotIdx === selSlot && 'bg-emerald-500/10')}>
                    <td className="py-2 pl-4"><PosBadge pos={p.position} /></td>
                    <td className="py-2 font-medium text-slate-200">{p.name}</td>
                    <td className="tabular py-2 text-center text-slate-400">{p.age}</td>
                    <td className="py-2 text-center text-xs text-slate-400">{FOOT_LABEL[p.foot]}</td>
                    <td className={cn('tabular py-2 text-center font-bold', ovrColor(ovr))}>{ovr}</td>
                    {selRole && (
                      <td className={cn('tabular py-2 text-center font-bold', ovrColor(roleRating))}>
                        {roleRating}
                        {positionFit(p.position, selRole) < 1 && <span className="ml-1 text-[10px] text-amber-400">↓</span>}
                      </td>
                    )}
                    {STAT_KEYS.map((k) => (
                      <td key={k} className={cn('tabular py-2 text-center text-xs', p.stats[k] >= 75 ? 'font-bold text-emerald-300' : p.stats[k] < 45 ? 'text-slate-600' : 'text-slate-300')}>
                        {p.stats[k]}
                      </td>
                    ))}
                    <td className="py-2"><ConditionBar value={p.condition} /></td>
                    <td className="tabular py-2 text-center text-xs text-slate-400">{p.level}</td>
                    <td className="py-2 pr-4 text-right">
                      {slotIdx >= 0
                        ? <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">선발 {slots[slotIdx].label}</span>
                        : <span className="text-[11px] text-slate-600">벤치</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
