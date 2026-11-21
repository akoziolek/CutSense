<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Scissors, Search, SearchX, X } from 'lucide-vue-next'
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
import type { PatternListItem, PatternFilters, PatternSort } from '@/types/pattern'
import { PATTERN_SIZE } from '@/types/pattern'
import { formatCardDate } from '@/utils/formatCardDate'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToQuery,
} from '@/utils/filters/patternFilters'
import { useAuth } from '@/stores/authStore'
import { useFavouriteToggle } from '@/composables/resources/useFavouriteToggle'
import { useSelection } from '@/composables/lists/useSelection'
import { useResourceTags } from '@/composables/resources/useResourceTags'
import { usePatternsList } from '@/composables/patterns/usePatternsList'

const PAGE_SIZE = 12
const DEFAULT_SORT: PatternSort = 'name_asc'
const { t } = useI18n()
const SORT_OPTIONS = computed<{ value: PatternSort; label: string }[]>(() => [
  { value: 'name_asc', label: t('common.sort.nameAscending') },
  { value: 'name_desc', label: t('common.sort.nameDescending') },
  { value: 'date_desc', label: t('common.sort.newest') },
  { value: 'date_asc', label: t('common.sort.oldest') },
])
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MAX = 100

const route = useRoute()
const router = useRouter()
const { state: authState } = useAuth()
const isLoggedIn = computed(() => !!authState.user)

const { toggle: toggleFavourite } = useFavouriteToggle('/patterns')

const sort = computed<PatternSort>(() => {
  const value = route.query.sort
  return SORT_OPTIONS.value.some((o) => o.value === value) ? (value as PatternSort) : DEFAULT_SORT
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

const toggleSize = (draft: PatternFilters, size: PATTERN_SIZE) => {
  const next = new Set(draft.sizes)
  if (next.has(size)) next.delete(size)
  else next.add(size)
  draft.sizes = Object.values(PATTERN_SIZE).filter((s) => next.has(s))
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

const {
  tags: availableTags,
  loading: tagsLoading,
  error: tagsError,
  loadTags,
} = useResourceTags('/patterns/tags', 'common.errors.tagsLoadFailed')

const { data, showSkeleton, error, clearSkeletonTimer, fetchPatterns } = usePatternsList({
  page,
  sort,
  search,
  filters,
  pageSize: PAGE_SIZE,
})

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

const showTrash = computed(() => isLoggedIn.value && !!data.value?.items.some((p) => p.isOwner))

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
        <span>{{ t('common.navigation.patterns') }}</span>
        <span v-if="data" class="ml-3 text-sm font-semibold">
          ({{ t('common.status.foundCount', { count: data.total }) }})
        </span>
      </PageHeader>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative flex-1 min-w-48">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchInput"
            type="text"
            autocomplete="off"
            :maxlength="SEARCH_MAX"
            :placeholder="t('patterns.search')"
            :aria-label="t('patterns.searchLabel')"
            class="h-9 pl-9 pr-9"
            @keydown.enter="flushSearch"
          />
          <button
            v-if="searchInput"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
            :aria-label="t('common.actions.clearSearch')"
            @click="clearSearch"
          >
            <X class="size-4" />
          </button>
        </div>

        <ListFilterPopover
          :model-value="filters"
          :empty-filters="emptyFilters"
          :show-favourites="isLoggedIn"
          :show-community="isLoggedIn"
          :tags="availableTags"
          :tags-loading="tagsLoading"
          :tags-error="tagsError"
          :active="hasActiveFilters"
          @apply="applyFilters"
          @opened="loadTags"
        >
          <template #default="{ draft }">
            <FilterSection :title="t('common.filters.size')" :default-open="true">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="size in PATTERN_SIZE"
                  :key="size"
                  type="button"
                  class="cursor-pointer rounded-md border px-2.5 py-1 text-xs hover:bg-brand-green hover:text-brand-green-foreground"
                  :class="
                    draft.sizes.includes(size)
                      ? 'border-foreground bg-brand-green text-brand-green-foreground dark:bg-brand-grey'
                      : 'border-border'
                  "
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
          <ErrorState
            :title="t('patterns.unableToLoadMany')"
            :message="error"
            :code="t('common.errors.errorCode')"
            :retry-label="t('common.actions.tryAgain')"
            :back-label="t('common.actions.backToHome')"
            back-to="/"
            @retry="fetchPatterns()"
          />
        </div>

        <!-- search or filters match nothing -->
        <div
          v-else-if="data && data.total === 0 && hasActiveCriteria"
          key="no-match"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <SearchX class="size-10 md:size-12 text-muted-foreground" />
          <h2 class="text-lg font-bold font-inter">{{ t('common.filters.noItemsFound') }}</h2>
          <p class="max-w-xs text-xs text-muted-foreground">
            {{ t('common.errors.noResults', { resource: t('patterns.plural') }) }}
          </p>
          <Button size="sm" class="mt-2 rounded-lg" @click="resetCriteria">
            {{ t('common.actions.clearFilters') }}
          </Button>
        </div>

        <!-- empty: nothing visible yet -->
        <div
          v-else-if="data && data.total === 0"
          key="empty"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <Scissors class="size-10 md:size-12 text-muted-foreground" />
          <h2 class="text-lg font-bold font-inter">{{ t('patterns.noItems') }}</h2>
          <!-- TODO - different description when user is logged -->
          <p class="max-w-xs text-xs text-muted-foreground">
            {{ t('patterns.emptyDescription') }}
          </p>
          <Button v-if="isLoggedIn" as-child size="sm" class="mt-2 rounded-lg">
            <RouterLink :to="{ name: 'PatternNew' }">{{ t('patterns.addFirst') }}</RouterLink>
          </Button>
        </div>

        <!-- list -->
        <div v-else-if="data" key="list" class="space-y-10">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <ResourceCard
              v-for="pattern in data.items"
              :key="pattern.id"
              :to="{ name: 'PatternDetails', params: { id: pattern.id } }"
              :title="pattern.name"
              :meta="`${formatCardDate(pattern.createdAt)} • ${pattern.size}`"
              :image-url="pattern.imageUrl"
              :is-favourite="pattern.isFavourite"
              :selectable="selectionMode"
              :selected="isSelected(pattern.id)"
              :disabled="selectionMode && !pattern.isOwner"
              :disabled-reason="t('patterns.onlyOwnCanDelete')"
              :toggleable="isLoggedIn"
              :show-favourite="isLoggedIn"
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

    <FloatingButton v-if="isLoggedIn" :to="{ name: 'PatternNew' }" />

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
