import { ref, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import type { PatternFilters, PatternListResponse, PatternSort } from '@/types/pattern'
import { filtersToApiParams } from '@/utils/filters/patternFilters'

interface UsePatternsListOptions {
  page: ComputedRef<number>
  sort: ComputedRef<PatternSort>
  search: ComputedRef<string>
  filters: ComputedRef<PatternFilters>
  pageSize: number
}

export function usePatternsList({ page, sort, search, filters, pageSize }: UsePatternsListOptions) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const data = ref<PatternListResponse | null>(null)
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

  const fetchPatterns = async (activeSignal = { active: true }) => {
    clearSkeletonTimer()
    error.value = ''
    isFetching.value = true
    showSkeleton.value = false

    skeletonTimer = setTimeout(() => {
      if (activeSignal.active && isFetching.value) showSkeleton.value = true
    }, 150)

    try {
      const params = new URLSearchParams({
        page: String(page.value),
        limit: String(pageSize),
        sort: sort.value,
      })
      if (search.value) params.set('q', search.value)
      for (const [key, value] of Object.entries(filtersToApiParams(filters.value))) {
        params.set(key, value)
      }

      const result = await api<PatternListResponse>(`/patterns?${params}`)
      if (!activeSignal.active) return

      if (result.totalPages > 0 && page.value > result.totalPages) {
        await router.replace({
          query: {
            ...route.query,
            page: result.totalPages === 1 ? undefined : String(result.totalPages),
          },
        })
        return
      }
      data.value = result
    } catch (e) {
      if (activeSignal.active) {
        error.value = e instanceof ApiError ? e.body.message : t('patterns.loadFailed')
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
    data,
    isFetching,
    showSkeleton,
    error,
    clearSkeletonTimer,
    fetchPatterns,
  }
}
