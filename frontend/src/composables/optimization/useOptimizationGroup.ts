import { computed, ref, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { api, apiBlob, ApiError } from '@/api/client'
import type { OptimizationView } from '@/types/optimization'
import { polygonAreaMm2 } from '@/utils/geometry'

export interface GroupSource {
  kind: 'runs' | 'saved'
  ids: string[]
}

export function useOptimizationGroup(source: ComputedRef<GroupSource>) {
  const { t } = useI18n()

  const items = ref<OptimizationView[]>([])
  const isFetching = ref(true)
  const error = ref('')
  const isNotFound = ref(false)

  const isSaving = ref(false)
  const saveError = ref('')
  const isRenaming = ref(false)
  const renameError = ref('')
  const downloadingKey = ref<string | null>(null)

  const pathFor = (kind: GroupSource['kind'], id: string) =>
    kind === 'runs'
      ? `/optimizations/runs/${encodeURIComponent(id)}`
      : `/optimizations/${encodeURIComponent(id)}`

  const fetchAll = async (signal = { active: true }) => {
    error.value = ''
    isNotFound.value = false
    isFetching.value = true
    try {
      const { kind, ids } = source.value
      const result = await Promise.all(ids.map((id) => api<OptimizationView>(pathFor(kind, id))))
      if (signal.active) items.value = result
    } catch (e) {
      if (signal.active) {
        isNotFound.value = e instanceof ApiError && e.status === 404
        error.value = e instanceof ApiError ? e.body.message : t('optimizations.loadFailed')
      }
    } finally {
      if (signal.active) isFetching.value = false
    }
  }

  const groupName = computed(() => items.value[0]?.name)
  const allSaved = computed(() => items.value.length > 0 && items.value.every((o) => o.isSaved))

  // combined statistics; percentages are relative to the total area of all fabrics
  const totals = computed(() => {
    const list = items.value
    const sum = (pick: (o: OptimizationView) => number) => list.reduce((s, o) => s + pick(o), 0)
    const fabricArea = sum((o) => polygonAreaMm2(o.fabric.boundary))
    const pct = (area: number) =>
      fabricArea > 0 ? Number(((area / fabricArea) * 100).toFixed(1)) : 0

    const usable = sum((o) => o.stats.usableScrapsArea)
    const waste = sum((o) => o.stats.wasteArea)
    const remaining = sum((o) => o.stats.remainingFabricArea)

    return {
      wasSuccessful: list.length > 0 && list.every((o) => o.wasSuccessful),
      minLengthMm: sum((o) => o.minLengthMm),
      executionTime: sum((o) => o.executionTime),
      usable,
      usablePct: pct(usable),
      waste,
      wastePct: pct(waste),
      remaining,
      remainingPct: pct(remaining),
    }
  })

  const saveAll = async (name: string): Promise<number[] | null> => {
    if (isSaving.value || source.value.kind !== 'runs') return null
    isSaving.value = true
    saveError.value = ''
    try {
      const { ids } = await api<{ id: number; ids: number[] }>('/optimizations/runs/save-group', {
        method: 'POST',
        body: JSON.stringify({ runIds: source.value.ids, name }),
      })
      toast.success(t('optimizations.savedToast'))
      return ids
    } catch (e) {
      saveError.value = e instanceof ApiError ? e.body.message : t('optimizations.saveFailed')
      return null
    } finally {
      isSaving.value = false
    }
  }

  const rename = async (name: string): Promise<boolean> => {
    const firstId = source.value.ids[0]
    if (!firstId || isRenaming.value) return false
    isRenaming.value = true
    renameError.value = ''
    try {
      await api(`/optimizations/${encodeURIComponent(firstId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      items.value.forEach((o) => (o.name = name))
      toast.success(t('optimizations.updatedToast'))
      return true
    } catch (e) {
      renameError.value = e instanceof ApiError ? e.body.message : t('optimizations.updateFailed')
      return false
    } finally {
      isRenaming.value = false
    }
  }

  // prints one fabric only
  const downloadPdf = async (
    opt: OptimizationView,
    format: 'a4' | 'actual',
    filenameSuffix?: string,
  ) => {
    const basePath =
      opt.isSaved && opt.id !== undefined
        ? `/optimizations/${opt.id}/pdf`
        : opt.runId
          ? `/optimizations/runs/${encodeURIComponent(opt.runId)}/pdf`
          : null
    if (!basePath || downloadingKey.value) return

    downloadingKey.value = String(opt.runId ?? opt.id)
    try {
      const blob = await apiBlob(`${basePath}?format=${format}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const baseName = `${
        opt.name ?? opt.fabric.name ?? opt.pattern?.name ?? 'optimization'
      }${filenameSuffix ? `-${filenameSuffix}` : ''}`
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
      downloadingKey.value = null
    }
  }

  return {
    items,
    isFetching,
    error,
    isNotFound,
    groupName,
    allSaved,
    totals,
    isSaving,
    saveError,
    isRenaming,
    renameError,
    downloadingKey,
    fetchAll,
    saveAll,
    rename,
    downloadPdf,
  }
}