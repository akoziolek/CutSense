import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface SortOption<S extends string> {
  value: S
  label: string
}

export function useListQuery<S extends string>(config: {
  defaultSort: S
  sortOptions: SortOption<S>[]
  searchMax?: number
  searchDebounceMs?: number
}) {
  const route = useRoute()
  const router = useRouter()
  const searchMax = config.searchMax ?? 100
  const debounceMs = config.searchDebounceMs ?? 300

  const sort = computed<S>(() => {
    const value = route.query.sort
    return config.sortOptions.some((o) => o.value === value) ? (value as S) : config.defaultSort
  })
  const page = computed(() => {
    const n = Number(route.query.page)
    return Number.isInteger(n) && n >= 1 ? n : 1
  })
  const search = computed(() =>
    typeof route.query.q === 'string' ? route.query.q.trim().slice(0, searchMax) : '',
  )

  // changing the sort order always goes back to the first page
  const sortModel = computed({
    get: () => sort.value,
    set: (value: S) =>
      router.push({
        query: { ...route.query, sort: value === config.defaultSort ? undefined : value, page: undefined },
      }),
  })

  const goToPage = (newPage: number) => {
    router.push({ query: { ...route.query, page: newPage === 1 ? undefined : String(newPage) } })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // filters: merge their query params and go back to the first page
  const applyQuery = (partial: Record<string, string | undefined>) =>
    router.push({ query: { ...route.query, ...partial, page: undefined } })

  const searchInput = ref(search.value)
  let timer: ReturnType<typeof setTimeout> | null = null
  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const applySearch = (value: string) => {
    const next = value.trim()
    if (next === search.value) return
    router.replace({ query: { ...route.query, q: next || undefined, page: undefined } })
  }
  const flushSearch = () => {
    clearTimer()
    applySearch(searchInput.value)
  }
  const clearSearch = () => {
    searchInput.value = ''
    flushSearch()
  }

  watch(searchInput, (value) => {
    clearTimer()
    timer = setTimeout(() => applySearch(value), debounceMs)
  })
  watch(search, (value) => {
    if (value !== searchInput.value.trim()) searchInput.value = value
  })
  onBeforeUnmount(clearTimer)

  const resetCriteria = () => {
    clearTimer()
    searchInput.value = ''
    router.push({ query: { sort: route.query.sort } })
  }

  return { page, sort, search, searchMax, sortModel, goToPage, applyQuery,
    searchInput, flushSearch, clearSearch, resetCriteria }
}