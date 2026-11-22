import { ref, toRaw, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { api, ApiError, apiBlob } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'
import { useSpatialHistory } from '@/composables/spatial/useSpatialHistory'

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

  const {
    canUndo,
    canRedo,
    recordAction,
    undo: undoHistory,
    redo: redoHistory,
    clear: clearHistory,
  } = useSpatialHistory()

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null
  let placementSyncQueue: Promise<void> = Promise.resolve()

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
    clearHistory()
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

  const applyAndSyncPlacement = (index: number, x: number, y: number): Promise<boolean> => {
    const opt = optimization.value
    if (!opt || isSavedRoute.value || opt.isSaved) return Promise.resolve(false)

    const target = opt.placements[index]
    if (!target) return Promise.resolve(false)

    const previous = structuredClone(toRaw(opt))
    const dx = x - target.x
    const dy = y - target.y

    target.x = x
    target.y = y
    target.polygon = target.polygon.map((pt) => ({
      x: pt.x + dx,
      y: pt.y + dy,
    }))

    const runId = resourceId.value
    const task = placementSyncQueue.then(async () => {
      try {
        const updated = await api<OptimizationView>(
          `/optimizations/runs/${encodeURIComponent(runId)}/placements`,
          {
            method: 'PATCH',
            body: JSON.stringify({ placements: [{ index, x, y }] }),
          },
        )
        optimization.value = updated
        return true
      } catch (e) {
        optimization.value = previous
        toast.error(e instanceof ApiError ? e.body.message : t('optimizations.updateFailed'))
        return false
      }
    })

    placementSyncQueue = task.then(() => undefined)
    return task
  }

  const movePlacement = async (index: number, nextX: number, nextY: number): Promise<boolean> => {
    const target = optimization.value?.placements?.[index]
    if (!target) return false

    const prevX = target.x
    const prevY = target.y
    if (prevX === nextX && prevY === nextY) return true

    const ok = await applyAndSyncPlacement(index, nextX, nextY)
    if (ok) {
      recordAction({
        undo: () => {
          void applyAndSyncPlacement(index, prevX, prevY)
        },
        redo: () => {
          void applyAndSyncPlacement(index, nextX, nextY)
        },
      })
    }
    return ok
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
      clearHistory()
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
    canUndo,
    canRedo,
    clearSkeletonTimer,
    fetchOptimization,
    downloadPdf,
    saveOptimization,
    renameOptimization,
    movePlacement,
    undoPlacement: undoHistory,
    redoPlacement: redoHistory,
  }
}
