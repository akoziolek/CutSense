import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'

export function useUpdateAccount() {
  const { t } = useI18n()
  const isSubmitting = ref(false)
  const submitError = ref('')

  const updateNickname = async (nickname: string): Promise<boolean> => {
    if (isSubmitting.value) return false
    submitError.value = ''
    isSubmitting.value = true

    try {
      await api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ nickname }),
      })
      return true
    } catch (e) {
      console.error('Failed to update account:', e)
      submitError.value = e instanceof ApiError ? e.body.message : t('account.updateFailed')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting,
    submitError,
    updateNickname,
  }
}
