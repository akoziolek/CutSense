import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { OptimizationFilterOptions } from '@/types/optimization'

export function useOptimizations() {
  const { t } = useI18n()

  // ---------- filter options ----------
  const options = ref<OptimizationFilterOptions | null>(null)
  const optionsLoading = ref(false)
  const optionsError = ref('')

  const loadOptions = async () => {
    if (options.value || optionsLoading.value) return
    optionsError.value = ''
    optionsLoading.value = true
    try {
      options.value = await api<OptimizationFilterOptions>('/optimizations/filter-options')
    } catch (e) {
      optionsError.value =
        e instanceof ApiError ? e.body.message : t('common.filters.optionsLoadFailed')
    } finally {
      optionsLoading.value = false
    }
  }

  const resetOptions = () => {
    options.value = null
  }

  // ---------- delete ----------
  const isDeleting = ref(false)
  const deleteError = ref('')

  const deleteOptimization = async (id: number): Promise<boolean> => {
    if (isDeleting.value) return false
    isDeleting.value = true
    deleteError.value = ''
    try {
      await api<void>(`/optimizations/${id}`, { method: 'DELETE' })
      return true
    } catch (e) {
      deleteError.value =
        e instanceof ApiError ? e.body.message : t('common.errors.somethingWentWrongRetry')
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ---------- rename ----------
  const isRenaming = ref(false)
  const renameError = ref('')

  const renameOptimization = async (id: number, name: string): Promise<boolean> => {
    if (isRenaming.value) return false
    isRenaming.value = true
    renameError.value = ''
    try {
      await api<{ id: number; name: string }>(`/optimizations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      return true
    } catch (e) {
      renameError.value = e instanceof ApiError ? e.body.message : t('optimizations.updateFailed')
      return false
    } finally {
      isRenaming.value = false
    }
  }

  return {
    options,
    optionsLoading,
    optionsError,
    loadOptions,
    resetOptions,
    isDeleting,
    deleteError,
    deleteOptimization,
    isRenaming,
    renameError,
    renameOptimization,
  }
}
