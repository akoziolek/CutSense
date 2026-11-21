import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { FabricFormPayload, FabricResponse } from '@/types/fabric'

export function useFabricEdit() {
  const { t } = useI18n()

  const fabric = ref<FabricResponse | null>(null)
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')

  const isSubmitting = ref(false)
  const submitError = ref('')

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

  const clearSkeletonTimer = () => {
    if (skeletonTimer) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  const fetchFabric = async (
    id: number,
    activeSignal = { active: true },
  ): Promise<FabricResponse | null> => {
    clearSkeletonTimer()
    fabric.value = null
    error.value = ''
    isFetching.value = true
    showSkeleton.value = false

    skeletonTimer = setTimeout(() => {
      if (activeSignal.active && isFetching.value) {
        showSkeleton.value = true
      }
    }, 150)

    try {
      const result = await api<FabricResponse>(`/fabrics/${id}`)
      if (activeSignal.active) {
        fabric.value = result
        return result
      }
      return null
    } catch (e) {
      if (activeSignal.active) {
        error.value = e instanceof ApiError ? e.body.message : t('fabrics.loadFailed')
      }
      return null
    } finally {
      if (activeSignal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  const updateFabric = async (id: number, payload: FabricFormPayload): Promise<boolean> => {
    submitError.value = ''
    isSubmitting.value = true

    try {
      await api(`/fabrics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description ? payload.description.trim() : null,
          tagIds: payload.tags.map((tag) => tag.id),
        }),
      })
      return true
    } catch (e) {
      console.error('Failed to update fabric:', e)
      submitError.value = e instanceof ApiError ? e.body.message : t('fabrics.updateFailed')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    fabric,
    isFetching,
    showSkeleton,
    error,
    isSubmitting,
    submitError,
    clearSkeletonTimer,
    fetchFabric,
    updateFabric,
  }
}
