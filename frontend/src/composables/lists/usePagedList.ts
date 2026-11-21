import { onBeforeUnmount, ref, watch, type Ref, type WatchSource } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'

export function usePagedList<T extends { total: number; totalPages: number }>(options: {
  path: string
  noun: string
  page: Ref<number>
  params: () => Record<string, string>
  sources: WatchSource[]
  onBeforeFetch?: () => void
}) {
  const route = useRoute()
  const router = useRouter()

  const data = ref(null) as Ref<T | null>
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null
  const clearSkeletonTimer = () => {
    if (skeletonTimer) clearTimeout(skeletonTimer)
    skeletonTimer = null
  }

  const fetchList = async (signal = { active: true }) => {
    clearSkeletonTimer()
    error.value = ''
    isFetching.value = true
    showSkeleton.value = false
    skeletonTimer = setTimeout(() => {
      if (signal.active && isFetching.value) showSkeleton.value = true
    }, 150)

    try {
      const result = await api<T>(`${options.path}?${new URLSearchParams(options.params())}`)
      if (!signal.active) return

      if (result.totalPages > 0 && options.page.value > result.totalPages) {
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
      if (signal.active) {
        error.value =
          e instanceof ApiError ? e.body.message : `Could not load ${options.noun}. Please try again.`
      }
    } finally {
      if (signal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  watch(
    options.sources,
    (_, __, onCleanup) => {
      options.onBeforeFetch?.()
      const signal = { active: true }
      onCleanup(() => {
        signal.active = false
        clearSkeletonTimer()
      })
      fetchList(signal)
    },
    { immediate: true },
  )
  onBeforeUnmount(clearSkeletonTimer)

  return { data, isFetching, showSkeleton, error, refetch: () => fetchList() }
}