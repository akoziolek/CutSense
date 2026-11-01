import { ref } from 'vue'
import { api, ApiError } from '@/api/client'

export function useBulkDelete(basePath: string, getIds: () => number[], onFinished: () => void) {
  const confirmOpen = ref(false)
  const successOpen = ref(false)
  const isDeleting = ref(false)
  const error = ref('')
  const deletedCount = ref(0)

  const request = () => {
    if (!getIds().length) return
    error.value = ''
    confirmOpen.value = true
  }

  const confirm = async () => {
    if (isDeleting.value) return
    isDeleting.value = true
    error.value = ''
    try {
      const { deletedIds } = await api<{ deletedIds: number[] }>(`${basePath}/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: getIds() }),
      })
      if (!deletedIds.length) {
        error.value = 'None of the selected items could be deleted. They may have been removed already.'
        return
      }
      deletedCount.value = deletedIds.length
      confirmOpen.value = false
      successOpen.value = true
    } catch (e) {
      error.value = e instanceof ApiError ? e.body.message : 'Could not delete the items. Please try again.'
    } finally {
      isDeleting.value = false
    }
  }

  const closeSuccess = () => {
    successOpen.value = false
    onFinished()
  }

  return { confirmOpen, successOpen, isDeleting, error, deletedCount, request, confirm, closeSuccess }
}