import type { ReactNode } from 'react';
import { Cloud, CloudOff, CloudUpload, Laptop, Loader2, LogIn, LogOut } from 'lucide-react';
import { cloudEnabled } from '../lib/supabase';
import { useCloud } from '../store/cloudStore';
import type { SaveSummary } from '../store/gameStore';
import { Btn, cn } from './ui';

function timeLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** 사이드바 하단 패널 */
export function CloudPanel() {
  const { user, status, lastSavedAt, error, signIn, signOut, saveNow } = useCloud();
  if (!cloudEnabled) return null;

  if (!user) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400"><CloudOff size={13} />이 기기에만 저장 중</div>
        <button type="button" onClick={() => void signIn()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
          <GoogleMark />구글로 로그인
        </button>
        <div className="text-[10px] leading-snug text-slate-500">로그인하면 진행 상황이 클라우드에 저장되어 다른 기기에서도 이어서 할 수 있습니다.</div>
      </div>
    );
  }

  const statusView = {
    off: null,
    idle: <span className="text-slate-400">대기</span>,
    loading: <span className="flex items-center gap-1 text-sky-300"><Loader2 size={11} className="animate-spin" />불러오는 중</span>,
    saving: <span className="flex items-center gap-1 text-sky-300"><Loader2 size={11} className="animate-spin" />저장 중</span>,
    saved: <span className="text-emerald-300">저장됨 · {timeLabel(lastSavedAt)}</span>,
    error: <span className="text-rose-300">오류</span>,
  }[status];

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center gap-2">
        {user.avatar
          ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
          : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">{user.name[0]}</div>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-200">{user.name}</div>
          <div className="flex items-center gap-1 text-[10px]"><Cloud size={10} className="text-slate-500" />{statusView}</div>
        </div>
      </div>
      {error && <div className="text-[10px] leading-snug text-rose-300">{error}</div>}
      <div className="flex gap-1.5">
        <Btn size="sm" variant="ghost" className="flex-1" disabled={status === 'loading' || status === 'saving'} onClick={() => void saveNow()}>
          <CloudUpload size={12} />지금 저장
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => void signOut()} title="로그아웃"><LogOut size={12} /></Btn>
      </div>
    </div>
  );
}

/** 모바일 상단바용 작은 버튼 */
export function CloudMini() {
  const { user, status, signIn } = useCloud();
  if (!cloudEnabled) return null;
  if (!user) {
    return (
      <button type="button" onClick={() => void signIn()} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-800">
        <LogIn size={12} />로그인
      </button>
    );
  }
  return (
    <span className={cn('flex items-center', status === 'error' ? 'text-rose-300' : status === 'saved' ? 'text-emerald-300' : 'text-sky-300')}>
      {status === 'saving' || status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
    </span>
  );
}

function SummaryBox({ title, icon, s, sub, onPick, primary }: {
  title: string; icon: ReactNode; s: SaveSummary; sub?: string; onPick: () => void; primary?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 font-semibold text-slate-100">{icon}{title}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-slate-500">시즌</dt><dd className="tabular text-right text-slate-200">{s.season} ({s.round}/{s.totalRounds}R)</dd>
        <dt className="text-slate-500">골드</dt><dd className="tabular text-right text-amber-300">{s.gold.toLocaleString()}</dd>
        <dt className="text-slate-500">스쿼드</dt><dd className="tabular text-right text-slate-200">{s.squad}명</dd>
        <dt className="text-slate-500">치른 경기</dt><dd className="tabular text-right text-slate-200">{s.matches}경기</dd>
      </dl>
      <Btn className="mt-4" variant={primary ? 'primary' : 'outline'} onClick={onPick}>이 저장본으로 계속</Btn>
    </div>
  );
}

/** 클라우드 저장본과 이 기기 저장본이 다를 때 선택 창 */
export function CloudConflictModal() {
  const { conflict, resolveConflict } = useCloud();
  if (!conflict) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="animate-slide-in w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">어느 저장본으로 이어서 할까요?</h2>
        <p className="mt-1 text-sm text-slate-400">클라우드와 이 기기에 서로 다른 진행 상황이 있습니다. 선택하지 않은 쪽은 덮어써집니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryBox title="클라우드" icon={<Cloud size={16} className="text-sky-300" />} s={conflict.cloud}
            sub={`마지막 저장 ${timeLabel(conflict.cloudUpdatedAt)}`} onPick={() => void resolveConflict('cloud')} primary />
          <SummaryBox title="이 기기" icon={<Laptop size={16} className="text-emerald-300" />} s={conflict.local}
            sub="현재 브라우저에 저장된 진행 상황" onPick={() => void resolveConflict('local')} />
        </div>
      </div>
    </div>
  );
}
