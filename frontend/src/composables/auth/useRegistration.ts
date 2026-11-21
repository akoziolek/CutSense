import { ref } from 'vue'
import { api, ApiError } from '@/api/client'

export type RegisterResult =
  | { ok: true }
  | { ok: false; unauthorized: true }
  | { ok: false; unauthorized?: false; message?: string }

export function useRegistration() {
  const googleName = ref('')
  const saving = ref(false)

  async function fetchRegistrationSession() {
    const { name } = await api<{ name: string }>('/auth/registration-session')
    googleName.value = name
  }

  async function register(nickname: string): Promise<RegisterResult> {
    saving.value = true
    try {
      await api<void>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nickname }),
      })
      return { ok: true }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          return { ok: false, unauthorized: true }
        }
        if (e.body.errorCode === 'VALIDATION_ERROR' && Array.isArray(e.body.details)) {
          return { ok: false, message: e.body.details.join(' ') }
        }
        return { ok: false, message: e.body.message }
      }
      return { ok: false }
    } finally {
      saving.value = false
    }
  }

  return {
    googleName,
    saving,
    fetchRegistrationSession,
    register,
  }
}
