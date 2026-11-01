<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RotateCcw, Scissors, Search, SearchX, X } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import SortMenu from '@/components/common/SortMenu.vue'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import FilterSection from '@/components/common/FilterSection.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import BulkDeleteControls from '@/components/common/BulkDeleteControls.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import {
  PATTERN_SIZES,
  type PatternListItem,
  type PatternListResponse,
  type PatternSize,
  type PatternSort,
} from '@/types/pattern'
import type { NameTag } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
  type PatternFilters,
} from '@/utils/patternFilters'
import { useAuth } from '@/composables/useAuth'
import { useFavouriteToggle } from '@/composables/useFavouriteToggle'
import { useSelection } from '@/composables/useSelection'

const PAGE_SIZE = 12
const DEFAULT_SORT: PatternSort = 'name_asc'
const SORT_OPTIONS: { value: PatternSort; label: string }[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
]
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MAX = 100

const route = useRoute()
const router = useRouter()
const { state: authState } = useAuth()
const isLoggedIn = computed(() => !!authState.user)

const { toggle: toggleFavourite } = useFavouriteToggle('/patterns')

const sort = computed<PatternSort>(() => {
  const value = route.query.sort
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as PatternSort) : DEFAULT_SORT
})
const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 ? n : 1
})

const sortModel = computed({
  get: () => sort.value,
  set: (value: PatternSort) =>
    router.push({
      query: { ...route.query, sort: value === DEFAULT_SORT ? undefined : value, page: undefined },
    }),
})

const goToPage = (newPage: number) => {
  router.push({ query: { ...route.query, page: newPage === 1 ? undefined : String(newPage) } })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ---------- filters ----------
const filters = computed(() => filtersFromQuery(route.query))
const filtersKey = computed(() => JSON.stringify(filters.value))
const hasActiveFilters = computed(() => countActiveFilters(filters.value) > 0)

const applyFilters = (next: PatternFilters) =>
  router.push({ query: { ...route.query, ...filtersToQuery(next), page: undefined } })

const toggleSize = (draft: PatternFilters, size: PatternSize) => {
  const next = new Set(draft.sizes)
  if (next.has(size)) next.delete(size)
  else next.add(size)
  draft.sizes = PATTERN_SIZES.filter((s) => next.has(s))
}

const availableTags = ref<NameTag[]>([])
const tagsLoaded = ref(false)
const tagsLoading = ref(false)
const tagsError = ref('')
const loadTags = async () => {
  if (tagsLoaded.value || tagsLoading.value) return
  tagsError.value = ''
  tagsLoading.value = true
  try {
    availableTags.value = await api<NameTag[]>('/patterns/tags')
    tagsLoaded.value = true
  } catch (e) {
    tagsError.value = e instanceof ApiError ? e.body.message : 'Could not load tags. Reopen to retry.'
  } finally {
    tagsLoading.value = false
  }
}

// ---------- search ----------
const search = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim().slice(0, SEARCH_MAX) : '',
)
const searchInput = ref(search.value)
const hasActiveCriteria = computed(() => hasActiveFilters.value || search.value !== '')

let searchTimer: ReturnType<typeof setTimeout> | null = null
const clearSearchTimer = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
}

const applySearch = (value: string) => {
  const next = value.trim()
  if (next === search.value) return
  router.replace({ query: { ...route.query, q: next || undefined, page: undefined } })
}
const flushSearch = () => {
  clearSearchTimer()
  applySearch(searchInput.value)
}
const clearSearch = () => {
  searchInput.value = ''
  flushSearch()
}

watch(searchInput, (value) => {
  clearSearchTimer()
  searchTimer = setTimeout(() => applySearch(value), SEARCH_DEBOUNCE_MS)
})
watch(search, (value) => {
  if (value !== searchInput.value.trim()) searchInput.value = value
})

const resetCriteria = () => {
  clearSearchTimer()
  searchInput.value = ''
  router.push({ query: { sort: route.query.sort } })
}

// ---------- selection (own patterns only) ----------
const contentRef = ref<HTMLElement | null>(null)
const { selectionMode, selectedIds, isSelected, toggleSelect, selectFromGesture, stopSelecting } =
  useSelection(contentRef)

const onGesture = (pattern: PatternListItem) => {
  if (pattern.isOwner) selectFromGesture(pattern.id)
}
const onContextMenu = (e: MouseEvent, pattern: PatternListItem) => {
  if (!pattern.isOwner) return // leave the browser menu alone
  e.preventDefault()
  selectFromGesture(pattern.id)
}

// ---------- list ----------
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
      limit: String(PAGE_SIZE),
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
      error.value =
        e instanceof ApiError ? e.body.message : 'Could not load patterns. Please try again.'
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}

const showTrash = computed(
  () => isLoggedIn.value && !!data.value?.items.some((p) => p.isOwner),
)

const onBulkDeleted = () => {
  stopSelecting()
  fetchPatterns()
}

watch(
  [page, sort, filtersKey, search, () => authState.user?.id],
  (_, __, onCleanup) => {
    stopSelecting()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchPatterns(activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div
      ref="contentRef"
      class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10"
    >
      <PageHeader>
        <span>Patterns</span>
        <span v-if="data" class="ml-3 text-sm font-semibold">({{ data.total }} found)</span>
      </PageHeader>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative flex-1 min-w-48">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchInput"
            type="text"
            autocomplete="off"
            :maxlength="SEARCH_MAX"
            placeholder="Search patterns..."
            aria-label="Search patterns"
            class="h-9 pl-9 pr-9"
            @keydown.enter="flushSearch"
          />
          <button
            v-if="searchInput"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            @click="clearSearch"
          >
            <X class="size-4" />
          </button>
        </div>

        <ListFilterPopover
          :model-value="filters"
          :empty-filters="emptyFilters"
          :show-favourites="isLoggedIn"
          :tags="availableTags"
          :tags-loading="tagsLoading"
          :tags-error="tagsError"
          :active="hasActiveFilters"
          @apply="applyFilters"
          @opened="loadTags"
        >
          <template #default="{ draft }">
            <FilterSection title="Size" :default-open="true">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="size in PATTERN_SIZES"
                  :key="size"
                  type="button"
                  class="cursor-pointer rounded-md border px-2.5 py-1 text-xs hover:bg-brand-green"
                  :class="draft.sizes.includes(size) ? 'border-foreground bg-brand-green' : 'border-border'"
                  :aria-pressed="draft.sizes.includes(size)"
                  :data-testid="`size-${size}`"
                  @click="toggleSize(draft, size)"
                >
                  {{ size }}
                </button>
              </div>
            </FilterSection>
          </template>
        </ListFilterPopover>

        <SortMenu v-model="sortModel" :options="SORT_OPTIONS" />
      </div>

      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <!-- loading -->
        <div
          v-if="showSkeleton"
          key="skeleton"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <div v-for="n in PAGE_SIZE" :key="n" class="space-y-3">
            <Skeleton class="aspect-square w-full rounded-md" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>

        <!-- error -->
        <div v-else-if="error" key="error">
          <ErrorState title="Unable to load patterns" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchPatterns()">
                <RotateCcw class="w-4 h-4" />
                <span>Try again</span>
              </Button>
              <Button as-child variant="default" class="rounded-lg gap-2">
                <RouterLink to="/">
                  <ArrowLeft class="w-4 h-4" />
                  <span>Back to home</span>
                </RouterLink>
              </Button>
            </template>
          </ErrorState>
        </div>

        <!-- search or filters match nothing -->
        <div
          v-else-if="data && data.total === 0 && hasActiveCriteria"
          key="no-match"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <SearchX class="size-8 text-muted-foreground" />
          <p class="max-w-xs text-xs text-muted-foreground">
            We couldn't find any patterns matching your criteria.
          </p>
          <Button variant="outline" size="sm" class="mt-2 rounded-lg" @click="resetCriteria">
            Clear filters
          </Button>
        </div>

        <!-- empty: nothing visible yet -->
        <div
          v-else-if="data && data.total === 0"
          key="empty"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <Scissors class="size-12 text-muted-foreground" />
          <h2 class="text-lg font-bold font-inter">No patterns yet</h2>
          <p class="max-w-xs text-xs text-muted-foreground">
            Bring your designs to life. Upload a file to add it to your library.
          </p>
          <Button v-if="isLoggedIn" as-child size="sm" class="mt-2 rounded-lg">
            <RouterLink :to="{ name: 'pattern-new' }">Add your first pattern</RouterLink>
          </Button>
        </div>

        <!-- list -->
        <div v-else-if="data" key="list" class="space-y-10">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <ResourceCard
              v-for="pattern in data.items"
              :key="pattern.id"
              :to="{ name: 'pattern-details', params: { id: pattern.id } }"
              :title="pattern.name"
              :meta="`${formatCardDate(pattern.createdAt)} • ${pattern.size}`"
              :is-favourite="pattern.isFavourite"
              :selectable="selectionMode"
              :selected="isSelected(pattern.id)"
              :disabled="selectionMode && !pattern.isOwner"
              disabled-reason="Only your own patterns can be selected for bulk actions"
              :toggleable="isLoggedIn"
              @toggle-favourite="toggleFavourite(pattern)"
              @toggle-select="toggleSelect(pattern.id)"
              @long-press="onGesture(pattern)"
              @contextmenu="(e: MouseEvent) => onContextMenu(e, pattern)"
            >
              <template #placeholder><Scissors class="size-8" /></template>
            </ResourceCard>
          </div>

          <ListPagination
            v-if="data.totalPages > 1"
            :page="page"
            :total="data.total"
            :items-per-page="PAGE_SIZE"
            @update:page="goToPage"
          />
        </div>
      </Transition>
    </div>

    <FloatingButton v-if="isLoggedIn" :to="{ name: 'pattern-new' }" />

    <BulkDeleteControls
      base-path="/patterns"
      noun="pattern"
      :ids="selectedIds"
      :visible="showTrash"
      @cancelled="stopSelecting"
      @finished="onBulkDeleted"
    />
  </GridLayout>
</template>