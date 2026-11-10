import type { ReactNode } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import { FOOT_LABEL, overall, ovrColor, ovrTier, POSITION_COLOR, STAT_SHORT } from '../engine/ratings';
import type { Player, Position } from '../types';
import { STAT_KEYS } from '../types';

export function cn(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}

// ---------------- Card ----------------
export function Card({
  title, icon, action, children, className, bodyClass,
}: {
  title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200">
            {icon && <span className="text-emerald-400">{icon}</span>}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className={cn('p-4', bodyClass)}>{children}</div>
    </section>
  );
}

// ---------------- Button ----------------
type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'gold';
export function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled, className, title,
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg';
  disabled?: boolean; className?: string; title?: string;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    gold: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
    ghost: 'bg-slate-800/70 text-slate-200 hover:bg-slate-700',
    outline: 'border border-slate-700 text-slate-200 hover:border-emerald-500/60 hover:text-emerald-300',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25',
  };
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-3 text-base' }[size];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        v[variant], s, className,
      )}
    >
      {children}
    </button>
  );
}

// ---------------- Segmented ----------------
export function Segmented<T extends string>({
  options, value, onChange, size = 'md',
}: {
  options: { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md';
}) {
  return (
    <div className="grid gap-1 rounded-lg bg-slate-950/70 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-sm',
            value === o.value ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Badges & Bars ----------------
export function PosBadge({ pos, label }: { pos: Position; label?: string }) {
  return (
    <span className={cn('inline-flex min-w-9 justify-center rounded border px-1.5 py-0.5 text-[11px] font-bold', POSITION_COLOR[pos])}>
      {label ?? pos}
    </span>
  );
}

export function statColor(v: number) {
  if (v >= 80) return 'bg-amber-400';
  if (v >= 70) return 'bg-emerald-400';
  if (v >= 60) return 'bg-sky-400';
  if (v >= 45) return 'bg-slate-400';
  return 'bg-rose-400';
}

export function StatBar({ value, max = 100, color, className }: { value: number; max?: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', color ?? statColor(value))} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function ConditionBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-400' : value >= 60 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-1.5">
      <StatBar value={value} color={color} className="w-12" />
      <span className="tabular w-7 text-right text-xs text-slate-400">{Math.round(value)}</span>
    </div>
  );
}

export function Stars({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="inline-flex">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={12} className={i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-700'} />
      ))}
    </span>
  );
}

export function Kpi({ label, value, sub, icon, accent = 'text-emerald-300' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
        {icon && <span className="text-slate-600">{icon}</span>}
      </div>
      <div className={cn('tabular mt-2 text-2xl font-bold', accent)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function ResultChip({ r }: { r: 'W' | 'D' | 'L' }) {
  const c = { W: 'bg-emerald-500/20 text-emerald-300', D: 'bg-slate-600/30 text-slate-300', L: 'bg-rose-500/20 text-rose-300' }[r];
  return <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold', c)}>{r}</span>;
}

// ---------------- Player Card ----------------
export function PlayerCard({ p, footer, animate }: { p: Player; footer?: ReactNode; animate?: boolean }) {
  const ovr = overall(p);
  const tier = ovrTier(ovr);
  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-gradient-to-b p-4', tier.cls, animate && 'animate-pop-in')}>
      <div className="flex items-start justify-between">
        <div>
          <div className={cn('tabular text-3xl font-black leading-none', ovrColor(ovr))}>{ovr}</div>
          <div className="mt-1"><PosBadge pos={p.position} /></div>
        </div>
        <span className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-300">{tier.label}</span>
      </div>
      <div className="mt-3 truncate text-base font-semibold text-slate-100">{p.name}</div>
      <div className="text-xs text-slate-400">{p.age}세 · {FOOT_LABEL[p.foot]} · Lv.{p.level}</div>
      <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-1.5">
        {STAT_KEYS.map((k) => (
          <div key={k} className="text-center">
            <div className="text-[9px] font-semibold text-slate-500">{STAT_SHORT[k]}</div>
            <div className={cn('tabular text-sm font-bold', p.stats[k] >= 70 ? 'text-emerald-300' : 'text-slate-200')}>{p.stats[k]}</div>
          </div>
        ))}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

// ---------------- Toast ----------------
interface ToastState {
  msg: string | null;
  kind: 'ok' | 'err';
  id: number;
  show: (msg: string, kind?: 'ok' | 'err') => void;
}
export const useToast = create<ToastState>((set) => ({
  msg: null,
  kind: 'ok',
  id: 0,
  show: (msg, kind = 'ok') => {
    const id = Date.now();
    set({ msg, kind, id });
    setTimeout(() => set((s) => (s.id === id ? { msg: null } : s)), 2600);
  },
}));

export function Toast() {
  const { msg, kind } = useToast();
  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className={cn(
        'animate-slide-in flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-2xl',
        kind === 'ok' ? 'border-emerald-500/40 bg-slate-900 text-emerald-200' : 'border-rose-500/40 bg-slate-900 text-rose-200',
      )}>
        {kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {msg}
      </div>
    </div>
  );
}

/** 액션 결과(에러 문자열 | null)를 토스트로 처리 */
export function notify(err: string | null, okMsg?: string) {
  const t = useToast.getState();
  if (err) t.show(err, 'err');
  else if (okMsg) t.show(okMsg, 'ok');
}
