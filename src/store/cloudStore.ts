// ============================================================
// 클라우드 세이브 (Supabase · 구글 로그인)
// ------------------------------------------------------------
// - 로그인 시 클라우드 저장본과 이 기기 저장본을 비교
//   · 마지막 동기화 이후 클라우드가 그대로면 → 이 기기 진행분을 이어서 업로드
//   · 이 기기가 새 게임이면 → 클라우드 저장본을 불러옴
//   · 둘 다 진행된 상태면 → 사용자가 선택 (충돌 모달)
// - 경기 진행 중(분 단위 재생)에는 저장하지 않고, 상태 변화 후 4초 디바운스로 자동 저장
// ============================================================
import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  extractSaveData, isFreshGame, saveSummary, useGame, type GameData, type SaveSummary,
} from './gameStore';

const TABLE = 'game_saves';
const META_KEY = 'stat-eleven-cloud-meta';
const SAVE_DEBOUNCE_MS = 4000;

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type CloudStatus = 'off' | 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface CloudConflict {
  cloudData: GameData;
  cloudUpdatedAt: string;
  cloud: SaveSummary;
  local: SaveSummary;
}

interface CloudState {
  user: CloudUser | null;
  status: CloudStatus;
  lastSavedAt: string | null;
  error: string | null;
  conflict: CloudConflict | null;
  /** 초기 동기화가 끝나 자동 저장이 허용된 상태 */
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  saveNow: () => Promise<void>;
  resolveConflict: (choice: 'cloud' | 'local') => Promise<void>;
}

// ---------------- 동기화 메타 (기기별) ----------------
interface SyncMeta { userId: string; cloudUpdatedAt: string }
function readMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}
function writeMeta(meta: SyncMeta | null) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* 저장 불가 환경은 무시 */
  }
}

function toCloudUser(u: User): CloudUser {
  const md = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: u.id,
    email: u.email ?? '',
    name: md.full_name ?? md.name ?? u.email?.split('@')[0] ?? '플레이어',
    avatar: md.avatar_url ?? md.picture,
  };
}

function isValidSave(d: unknown): d is GameData {
  const g = d as GameData | null;
  return !!g && Array.isArray(g.squad) && Array.isArray(g.lineup) && !!g.league && Array.isArray(g.aiTeams);
}

export const useCloud = create<CloudState>((set, get) => ({
  user: null,
  status: supabase ? 'idle' : 'off',
  lastSavedAt: null,
  error: null,
  conflict: null,
  ready: false,

  signIn: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) set({ status: 'error', error: `로그인 실패: ${error.message}` });
  },

  signOut: async () => {
    if (!supabase) return;
    if (saveTimer) clearTimeout(saveTimer);
    // 로그아웃 전에 마지막 진행분 저장
    if (get().ready) await uploadSave();
    await supabase.auth.signOut();
    syncedUserId = null;
    set({ user: null, ready: false, status: 'idle', conflict: null, error: null, lastSavedAt: null });
  },

  saveNow: async () => {
    if (saveTimer) clearTimeout(saveTimer);
    await uploadSave();
  },

  resolveConflict: async (choice) => {
    const c = get().conflict;
    const user = get().user;
    if (!c || !user) return;
    if (choice === 'cloud') {
      useGame.setState(c.cloudData);
      writeMeta({ userId: user.id, cloudUpdatedAt: c.cloudUpdatedAt });
      set({ conflict: null, ready: true, status: 'saved', lastSavedAt: c.cloudUpdatedAt });
    } else {
      set({ conflict: null, ready: true });
      await uploadSave();
    }
  },
}));

// ---------------- 저장 / 불러오기 ----------------
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let syncedUserId: string | null = null;
let saving = false;
let pendingSave = false;

async function uploadSave() {
  const { user, ready } = useCloud.getState();
  if (!supabase || !user || !ready) return;
  if (saving) { pendingSave = true; return; }
  saving = true;
  useCloud.setState({ status: 'saving', error: null });
  const data = extractSaveData(useGame.getState());
  const { data: row, error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, data, version: 1, summary: saveSummary(data), updated_at: new Date().toISOString() })
    .select('updated_at')
    .single();
  saving = false;
  if (error || !row) {
    useCloud.setState({ status: 'error', error: `클라우드 저장 실패: ${error?.message ?? '알 수 없는 오류'}` });
  } else {
    writeMeta({ userId: user.id, cloudUpdatedAt: row.updated_at as string });
    useCloud.setState({ status: 'saved', lastSavedAt: row.updated_at as string });
  }
  if (pendingSave) { pendingSave = false; void uploadSave(); }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void uploadSave(), SAVE_DEBOUNCE_MS);
}

async function syncOnLogin(user: CloudUser) {
  if (!supabase) return;
  syncedUserId = user.id;
  useCloud.setState({ user, status: 'loading', ready: false, error: null });

  const { data: row, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    // 불러오기에 실패하면 덮어쓰기 위험이 있으므로 자동 저장을 켜지 않는다
    useCloud.setState({ status: 'error', error: `클라우드 불러오기 실패: ${error.message}` });
    return;
  }

  const local = extractSaveData(useGame.getState());

  // 클라우드에 저장본 없음 → 이 기기 진행분 업로드
  if (!row || !isValidSave(row.data)) {
    useCloud.setState({ ready: true });
    await uploadSave();
    return;
  }

  const cloudUpdatedAt = row.updated_at as string;
  const meta = readMeta();

  // 마지막 동기화 이후 클라우드가 그대로 → 이 기기 진행분이 최신
  if (meta && meta.userId === user.id && meta.cloudUpdatedAt === cloudUpdatedAt) {
    useCloud.setState({ ready: true, status: 'saved', lastSavedAt: cloudUpdatedAt });
    scheduleSave();
    return;
  }

  // 이 기기가 새 게임 → 클라우드 저장본 불러오기
  if (isFreshGame(local)) {
    useGame.setState(row.data);
    writeMeta({ userId: user.id, cloudUpdatedAt });
    useCloud.setState({ ready: true, status: 'saved', lastSavedAt: cloudUpdatedAt });
    return;
  }

  // 양쪽 모두 진행됨 → 사용자 선택
  useCloud.setState({
    status: 'idle',
    conflict: { cloudData: row.data, cloudUpdatedAt, cloud: saveSummary(row.data), local: saveSummary(local) },
  });
}

// ---------------- 초기화 ----------------
let initialized = false;

export function initCloud() {
  if (!supabase || initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    if (!u) {
      if (syncedUserId) {
        syncedUserId = null;
        useCloud.setState({ user: null, ready: false, status: 'idle' });
      }
      return;
    }
    // 토큰 갱신 등으로 같은 사용자 이벤트가 반복되면 재동기화하지 않음
    if (syncedUserId === u.id) return;
    // 콜백 안에서 Supabase 호출 시 교착을 피하기 위해 다음 틱에서 실행
    setTimeout(() => void syncOnLogin(toCloudUser(u)), 0);
  });

  // OAuth 리다이렉트 후 주소창의 ?code= 정리
  if (window.location.search.includes('code=')) {
    setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 1500);
  }

  // 게임 상태가 바뀌면 자동 저장 (경기 재생 중에는 보류)
  useGame.subscribe((state) => {
    const { user, ready } = useCloud.getState();
    if (!user || !ready) return;
    if (state.liveMatch && !state.liveMatch.finished) return;
    scheduleSave();
  });

  window.addEventListener('beforeunload', () => {
    if (saveTimer && useCloud.getState().ready) void uploadSave();
  });
}
