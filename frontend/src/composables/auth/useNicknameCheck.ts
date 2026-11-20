import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api/client'

export function useNicknameCheck(regex: RegExp) {
  const { t } = useI18n()
  const isChecking = ref(false)
  const isAvailable = ref(false)
  const availabilityError = ref('')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null

  const cancelPending = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (abortController) abortController.abort()
  }

  const check = (rawValue: string, currentNickname = '') => {
    const clean = rawValue.trim()
    cancelPending()

    availabilityError.value = ''
    isAvailable.value = false

    if (!clean || !regex.test(clean) || clean === currentNickname.trim()) {
      isChecking.value = false
      return
    }

    isChecking.value = true
    debounceTimer = setTimeout(async () => {
      abortController = new AbortController()
      try {
        const res = await api<{ available: boolean }>(
          `/users/check-nickname?nickname=${encodeURIComponent(clean)}`,
          { signal: abortController.signal },
        )
        if (res.available) {
          isAvailable.value = true
        } else {
          availabilityError.value = t('auth.nicknameTaken')
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
        availabilityError.value = t('auth.nicknameCheckFailed')
      } finally {
        isChecking.value = false
      }
    }, 350)
  }

  onBeforeUnmount(cancelPending)

  return {
    isChecking,
    isAvailable,
    availabilityError,
    check,
  }
}
