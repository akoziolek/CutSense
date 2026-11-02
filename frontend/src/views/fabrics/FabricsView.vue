<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RotateCcw, Search, Shirt, X } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import SortMenu from '@/components/common/SortMenu.vue'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import FilterSection from '@/components/common/FilterSection.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/api/client'
import type { FabricListResponse, FabricSort, NameTag } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import { useFavouriteToggle } from '@/composables/useFavouriteToggle'
import { SearchX } from 'lucide-vue-next'
import {
  countActiveFilters, emptyFilters, filtersFromQuery, filtersToApiParams, filtersToQuery, areaRangeError, type FabricFilters,
} from '@/utils/fabricFilters'
import { useSelection } from '@/composables/useSelection'
import BulkDeleteControls from '@/components/common/BulkDeleteControls.vue'

const PAGE_SIZE = 12
const DEFAULT_SORT: FabricSort = 'date_desc'
const SORT_OPTIONS: { value: FabricSort; label: string }[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'area_asc', label: 'Smallest first' },
  { value: 'area_desc', label: 'Biggest first' },
]
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MAX = 100

const route = useRoute()
const router = useRouter()

const sort = computed<FabricSort>(() => {
  const value = route.query.sort
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as FabricSort) : DEFAULT_SORT
})
const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 ? n : 1
})

const filters = computed(() => filtersFromQuery(route.query))
const filtersKey = computed(() => JSON.stringify(filters.value))
const hasActiveFilters = computed(() => countActiveFilters(filters.value) > 0)

const applyFilters = (next: FabricFilters) =>
  router.push({ query: { ...route.query, ...filtersToQuery(next), page: undefined } })

const availableTags = ref<NameTag[]>([])
const tagsLoaded = ref(false)
const tagsLoading = ref(false)
const tagsError = ref('')
const loadTags = async () => {
  if (tagsLoaded.value || tagsLoading.value ) return
  tagsError.value = ''
  tagsLoading.value = true
  try {
    availableTags.value = await api<NameTag[]>('/fabrics/tags')
    tagsLoaded.value = true
  } catch (e) {
    tagsError.value = e instanceof ApiError ? e.body.message : 'Could not load tags. Reopen to retry.'
  } finally {
    tagsLoading.value = false
  }
}

const sortModel = computed({
  get: () => sort.value,
  set: (value: FabricSort) =>
    router.push({
      query: { ...route.query, sort: value === DEFAULT_SORT ? undefined : value, page: undefined },
    }),
})

const goToPage = (newPage: number) => {
  router.push({ query: { ...route.query, page: newPage === 1 ? undefined : String(newPage) } })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

//--- searching ---
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

const data = ref<FabricListResponse | null>(null)
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

const fetchFabrics = async (activeSignal = { active: true }) => {
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
    if (search.value) {
      params.set('q', search.value)
    }
    for (const [key, value] of Object.entries(filtersToApiParams(filters.value))) params.set(key, value)

    const result = await api<FabricListResponse>(`/fabrics?${params}`)
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
        e instanceof ApiError ? e.body.message : 'Could not load fabrics. Please try again.'
    }
  } finally {
    if (activeSignal.active) {
      isFetching.value = false
      showSkeleton.value = false
      clearSkeletonTimer()
    }
  }
}




const { toggle: toggleFavourite } = useFavouriteToggle()

const contentRef = ref<HTMLElement | null>(null)
const { selectionMode, selectedIds, isSelected, toggleSelect, selectFromGesture, stopSelecting } =
  useSelection(contentRef)

const showTrash = computed(() => data.value?.total !== 0)

const onBulkDeleted = () => {
  stopSelecting()
  fetchFabrics()
}

watch(
  [page, sort, filtersKey, search],
  (_, __, onCleanup) => {
    stopSelecting()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    fetchFabrics(activeSignal)
  },
  { immediate: true },
)

const noSpinner = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
</script>

<template>
  <GridLayout>
    <div
      ref="contentRef"
      class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10"
    >
      <PageHeader>
        <span>Fabrics</span>
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
            placeholder="Search fabrics..."
            aria-label="Search fabrics"
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

        <!-- Filter Popover -->
        <ListFilterPopover
          :model-value="filters"
          :empty-filters="emptyFilters"
          :tags="availableTags"
          :tags-loading="tagsLoading"
          :tags-error="tagsError"
          :active="hasActiveFilters"
          :extra-error="areaRangeError"
          @apply="applyFilters"
          @opened="loadTags"
        >
          <template #default="{ draft }">
            <FilterSection title="Area" :default-open="false">
              <div class="grid grid-cols-2 gap-2">
                <label class="space-y-1 text-xs">
                  <span>From</span>
                  <div class="relative">
                    <Input
                      v-model="draft.areaMin"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      :class="['h-8 pr-8 text-xs', noSpinner]"
                      data-testid="area-min"
                    />
                    <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m²</span>
                  </div>
                </label>
                <label class="space-y-1 text-xs">
                  <span>To</span>
                  <div class="relative">
                    <Input
                      v-model="draft.areaMax"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="∞"
                      :class="['h-8 pr-8 text-xs', noSpinner]"
                      data-testid="area-max"
                    />
                    <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m²</span>
                  </div>
                </label>
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
          <ErrorState title="Unable to load fabrics" :message="error" code="Error">
            <template #actions>
              <Button variant="outline" class="rounded-lg gap-2" @click="fetchFabrics()">
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

        <!-- filters are active but nothing matches -->
        <div
          v-else-if="data && data.total === 0 && hasActiveCriteria"
          key="no-match"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <SearchX class="size-8 text-muted-foreground" />
          <p class="max-w-xs text-xs text-muted-foreground">
            We couldn't find any fabrics matching your criteria.
          </p>
          <Button variant="outline" size="sm" class="mt-2 rounded-lg" @click="resetCriteria">
            Clear filters
          </Button>
        </div>

        <!-- empty: user has no fabrics yet -->
        <div
          v-else-if="data && data.total === 0"
          key="empty"
          class="flex flex-col items-center justify-center gap-2 py-20 text-center"
        >
          <Shirt class="size-8 text-muted-foreground" />
          <h2 class="text-sm font-bold font-inter">No fabrics yet</h2>
          <p class="max-w-xs text-xs text-muted-foreground">
            Upload an image to start configuring your materials and optimizing fabric usage.
          </p>
          <Button as-child size="sm" class="mt-2 rounded-lg">
            <RouterLink :to="{ name: 'AddFabric' }">Add your first fabric</RouterLink>
          </Button>
        </div>

        <!-- list -->
        <div v-else-if="data" key="list" class="space-y-10">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <ResourceCard
              v-for="fabric in data.items"
              :key="fabric.id"
              :to="{ name: 'FabricDetails', params: { id: fabric.id } }"
              :title="fabric.name"
              :meta="`${formatCardDate(fabric.createdAt)} • ${(fabric.areaMm2 / 1_000_000).toFixed(1)} m²`"
              :image-url="fabric.pictureUrl"
              :is-favourite="fabric.isFavourite"
              :selectable="selectionMode"
              :selected="isSelected(fabric.id)"
              toggleable
              @toggle-favourite="toggleFavourite(fabric)"
              @toggle-select="toggleSelect(fabric.id)"
              @long-press="selectFromGesture(fabric.id)"
              @contextmenu.prevent="selectFromGesture(fabric.id)"
            />
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

    <FloatingButton :to="{ name: 'AddFabric' }" />
    <BulkDeleteControls
      base-path="/fabrics"
      noun="fabric"
      :ids="selectedIds"
      :visible="showTrash"
      @cancelled="stopSelecting"
      @finished="onBulkDeleted"
    />


  </GridLayout>
</template>
