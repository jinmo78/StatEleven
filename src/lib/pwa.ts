// ============================================================
// 홈 화면 설치(PWA) 도우미
// ============================================================
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export const isKakaoInApp = () => /KAKAOTALK/i.test(ua);
/** 삼성 인터넷: 자체 생성 WebAPK가 Play 프로텍트에 차단되는 경우가 있어 별도 안내 */
export const isSamsungBrowser = () => /SamsungBrowser/i.test(ua);
export const isIOS = () => /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
/** iOS에서 Safari가 아닌 브라우저(크롬·네이버 등)는 홈 화면 추가 위치가 다름 */
export const isIOSSafari = () => isIOS() && !/CriOS|FxiOS|EdgiOS|NAVER|Whale|KAKAOTALK|Line|Instagram|FBAN/i.test(ua);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** 카카오톡 내장 브라우저 → 기본 브라우저(크롬/사파리)로 현재 페이지 열기 */
export function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}

/** 안드로이드에서 현재 페이지를 크롬으로 열기 (크롬이 없으면 같은 주소로 이동) */
export function openInChrome() {
  const { host, pathname, search, href } = window.location;
  window.location.href =
    `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  promptInstall: () => Promise<boolean>;
}

export const useInstall = create<InstallState>((set, get) => ({
  deferred: null,
  installed: false,
  promptInstall: async () => {
    const ev = get().deferred;
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    set({ deferred: null });
    return outcome === 'accepted';
  },
}));

/** 앱 시작 시 1회 호출: 설치 이벤트 수집 + 서비스 워커 등록 */
export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 브라우저 기본 미니 배너 대신 게임 내 버튼으로 안내
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ installed: true, deferred: null }));

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
        /* 등록 실패해도 게임은 정상 동작 */
      });
    });
  }
}
