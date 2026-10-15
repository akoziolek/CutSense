import { reactive, readonly } from 'vue';
import { api, ApiError, googleLoginUrl } from '../api/client';
import { rememberReturnTo } from '../utils/returnTo';

export interface CurrentUser {
  id: number;
  nickname: string | null;
  email: string;
  avatar: string | null;
}

const state = reactive<{ user: CurrentUser | null; loaded: boolean }>({
  user: null,
  loaded: false,
});

export function useAuth() {
  // who is logged in (401 is a guest )
  async function loadUser(force = false) {
    if (state.loaded && !force) return;
    try {
      state.user = await api<CurrentUser>('/auth/me');
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      state.user = null;
    }
    state.loaded = true;
  }

  async function logout() {
    await api<void>('/auth/logout', { method: 'POST' });
    state.user = null;
  }

  return { state: readonly(state), loadUser, logout };
}

export function login(returnTo?: string | null) {
  rememberReturnTo(returnTo ?? new URLSearchParams(window.location.search).get('redirect'));
  window.location.href = googleLoginUrl;
}