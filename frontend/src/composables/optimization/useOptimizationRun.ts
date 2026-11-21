import { ref, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { api, ApiError, apiBlob } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'

export function useOptimizationRun(
  isSavedRoute: ComputedRef<boolean>,
  resourceId: ComputedRef<string>,
) {
  const { t } = useI18n()

  const optimization = ref<OptimizationView | null>(null)
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')
  const isNotFound = ref(false)

  const isDownloadingPdf = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const isRenaming = ref(false)
  const renameError = ref('')

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

  const clearSkeletonTimer = () => {
    if (skeletonTimer) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  const fetchOptimization = async (activeSignal = { active: true }) => {
    const path = isSavedRoute.value
      ? `/optimizations/${encodeURIComponent(resourceId.value)}`
      : `/optimizations/runs/${encodeURIComponent(resourceId.value)}`

    clearSkeletonTimer()
    optimization.value = null
    error.value = ''
    isNotFound.value = false
    isFetching.value = true
    showSkeleton.value = false

    skeletonTimer = setTimeout(() => {
      if (activeSignal.active && isFetching.value) showSkeleton.value = true
    }, 150)

    try {
      const result = await api<OptimizationView>(path)
      if (activeSignal.active) optimization.value = result
    } catch (e) {
      if (activeSignal.active) {
        isNotFound.value = e instanceof ApiError && e.status === 404
        error.value = e instanceof ApiError ? e.body.message : t('optimizations.loadFailed')
      }
    } finally {
      if (activeSignal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  const downloadPdf = async (format: 'a4' | 'actual') => {
    const opt = optimization.value
    if (!opt || isDownloadingPdf.value) return

    const basePath =
      opt.isSaved && opt.id !== undefined
        ? `/optimizations/${opt.id}/pdf`
        : opt.runId
          ? `/optimizations/runs/${encodeURIComponent(opt.runId)}/pdf`
          : null

    if (!basePath) return

    isDownloadingPdf.value = true
    try {
      const blob = await apiBlob(`${basePath}?format=${format}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const baseName = (opt.name ?? opt.pattern?.name ?? 'optimization')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
      link.href = url
      link.download = `${baseName}-${format === 'actual' ? '1-to-1' : 'a4'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.body.message : t('optimizations.downloadPdfFailed'))
    } finally {
      isDownloadingPdf.value = false
    }
  }

  const saveOptimization = async (name: string): Promise<number | null> => {
    const runId = optimization.value?.runId
    if (!runId || isSaving.value) return null

    isSaving.value = true
    saveError.value = ''
    try {
      const { id } = await api<{ id: number }>(`/optimizations/runs/${runId}/save`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      toast.success(t('optimizations.savedToast'))
      return id
    } catch (e) {
      if (e instanceof ApiError) {
        saveError.value =
          e.body.errorCode === 'VALIDATION_ERROR' && Array.isArray(e.body.details)
            ? e.body.details.join(' ')
            : e.body.message
      } else {
        saveError.value = t('optimizations.saveFailed')
      }
      return null
    } finally {
      isSaving.value = false
    }
  }

  const renameOptimization = async (name: string): Promise<boolean> => {
    if (!optimization.value?.id || isRenaming.value) return false
    isRenaming.value = true
    renameError.value = ''
    try {
      const updated = await api<{ id: number; name: string }>(
        `/optimizations/${optimization.value.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        },
      )
      optimization.value.name = updated.name
      toast.success(t('optimizations.updatedToast'))
      return true
    } catch (e) {
      renameError.value = e instanceof ApiError ? e.body.message : t('optimizations.updateFailed')
      return false
    } finally {
      isRenaming.value = false
    }
  }

  return {
    optimization,
    isFetching,
    showSkeleton,
    error,
    isNotFound,
    isDownloadingPdf,
    isSaving,
    saveError,
    isRenaming,
    renameError,
    clearSkeletonTimer,
    fetchOptimization,
    downloadPdf,
    saveOptimization,
    renameOptimization,
  }
}
