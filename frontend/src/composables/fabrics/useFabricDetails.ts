import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { FabricResponse } from '@/types/fabric'

export function useFabricDetails() {
  const { t } = useI18n()

  const fabric = ref<FabricResponse | null>(null)
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

  const clearSkeletonTimer = () => {
    if (skeletonTimer) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  const fetchFabric = async (id: string, activeSignal = { active: true }) => {
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
      const result = await api<FabricResponse>(`/fabrics/${encodeURIComponent(id)}`)
      if (activeSignal.active) fabric.value = result
    } catch (e) {
      if (activeSignal.active) {
        error.value = e instanceof ApiError ? e.body.message : t('fabrics.loadFailed')
      }
    } finally {
      if (activeSignal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  return {
    fabric,
    isFetching,
    showSkeleton,
    error,
    clearSkeletonTimer,
    fetchFabric,
  }
}
