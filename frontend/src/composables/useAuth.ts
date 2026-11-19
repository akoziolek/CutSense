import { reactive, readonly } from 'vue'
import { api, ApiError, googleLoginUrl, UNAUTHORIZED_EVENT } from '../api/client'
import type { CurrentUser } from '@/types/auth'
import { clearReturnTo, rememberReturnTo } from '../utils/returnTo'

const state = reactive<{ user: CurrentUser | null; loaded: boolean }>({
  user: null,
  loaded: false,
})

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cutsense-auth') : null

const forgetUser = () => {
  state.user = null
  state.loaded = true
}

// who is logged in (401 is a guest)
async function loadUser(force = false) {
  if (state.loaded && !force) return
  try {
    state.user = await api<CurrentUser>('/users/me')
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e
    state.user = null
  }
  state.loaded = true
}

async function logout() {
  await api<void>('/auth/logout', { method: 'POST' })
  forgetUser()
  clearReturnTo()
  channel?.postMessage('logout')
}

// re-check the session of a page that may be stale
const revalidate = () => {
  if (!state.user) return
  loadUser(true).catch(() => {})
}

if (typeof window !== 'undefined') {
  // any request answered with 401 means the session is gone
  window.addEventListener(UNAUTHORIZED_EVENT, () => {
    if (state.user) forgetUser()
  })
  // logout in another tab
  channel?.addEventListener('message', (e) => {
    if (e.data === 'logout') forgetUser()
  })
  // page restored from bfcache (Back/Forward): the router guard does not run, JS state is old
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) revalidate()
  })
  // coming back to the tab (session expired, logged out elsewhere)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidate()
  })
}

export function useAuth() {
  return { state: readonly(state), loadUser, logout }
}

export function login(returnTo?: string | null) {
  rememberReturnTo(returnTo ?? new URLSearchParams(window.location.search).get('redirect'))
  window.location.href = googleLoginUrl
}