import { useState } from 'react';
import { Chrome, ExternalLink, Share, Smartphone, X } from 'lucide-react';
import {
  isIOSSafari, isKakaoInApp, isSamsungBrowser, isStandalone, openInChrome, openInExternalBrowser, useInstall,
} from '../lib/pwa';
import { Btn } from './ui';

const DISMISS_KEY = 'stat-eleven-install-dismissed';

function readDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

/** 상단 안내 배너: 카톡 내장 브라우저 → 외부 브라우저 / 설치 가능 → 설치 버튼 / iOS 사파리 → 추가 방법 */
export function InstallBanner() {
  const deferred = useInstall((s) => s.deferred);
  const installed = useInstall((s) => s.installed);
  const promptInstall = useInstall((s) => s.promptInstall);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [kakaoClosed, setKakaoClosed] = useState(false);

  if (isStandalone() || installed) return null;

  // 카카오톡 내장 브라우저: 설치·구글 로그인 모두 불가 → 외부 브라우저 안내 (매번 표시)
  if (isKakaoInApp()) {
    if (kakaoClosed) return null;
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
        <ExternalLink size={18} className="shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          카카오톡 브라우저에서는 <b>홈 화면 추가</b>와 <b>구글 로그인</b>이 되지 않아요.
        </div>
        <Btn size="sm" variant="gold" onClick={openInExternalBrowser}>외부 브라우저로 열기</Btn>
        <button type="button" onClick={() => setKakaoClosed(true)} className="text-amber-300/70 hover:text-amber-200" aria-label="닫기"><X size={16} /></button>
      </div>
    );
  }

  if (dismissed) return null;
  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 무시 */ }
  };

  // 삼성 인터넷: 앱 설치 시 Play 프로텍트 경고가 뜰 수 있어 크롬 설치 또는 바로가기 추가를 안내
  if (isSamsungBrowser()) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        <Smartphone size={18} className="shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <b>크롬</b>에서 홈 화면에 추가하면 앱처럼 실행할 수 있어요.
          <div className="mt-0.5 text-xs text-emerald-200/70">삼성 인터넷에서는 메뉴(≡) → <b>페이지 추가</b> → <b>홈 화면</b>으로 바로가기를 만들 수 있어요.</div>
        </div>
        <Btn size="sm" onClick={openInChrome}><Chrome size={14} />크롬에서 열기</Btn>
        <button type="button" onClick={close} className="text-emerald-300/70 hover:text-emerald-200" aria-label="닫기"><X size={16} /></button>
      </div>
    );
  }

  // 안드로이드 크롬 등: 설치 버튼
  if (deferred) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        <Smartphone size={18} className="shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">홈 화면에 추가하면 <b>앱처럼 바로 실행</b>할 수 있어요.</div>
        <Btn size="sm" onClick={() => void promptInstall()}>홈 화면에 추가</Btn>
        <button type="button" onClick={close} className="text-emerald-300/70 hover:text-emerald-200" aria-label="닫기"><X size={16} /></button>
      </div>
    );
  }

  // iOS 사파리: 설치 API가 없어 수동 안내
  if (isIOSSafari()) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100">
        <Smartphone size={18} className="shrink-0 text-sky-300" />
        <div className="min-w-0 flex-1">
          아래 <Share size={14} className="mx-0.5 inline -translate-y-0.5" /> <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 실행할 수 있어요.
        </div>
        <button type="button" onClick={close} className="text-sky-300/70 hover:text-sky-200" aria-label="닫기"><X size={16} /></button>
      </div>
    );
  }

  return null;
}
