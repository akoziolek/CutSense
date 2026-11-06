<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Scissors } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import FilterSection from '@/components/common/FilterSection.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import SelectableResourceList from '@/components/common/SelectableResourceList.vue'
import type { SortOption } from '@/composables/useListQuery'
import { api, ApiError } from '@/api/client'
import { PATTERN_SIZES, type PatternListItem, type PatternSize, type PatternSort } from '@/types/pattern'
import type { NameTag } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useRoute, useRouter } from 'vue-router'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
  type PatternFilters,
} from '@/utils/patternFilters'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { state: authState } = useAuth()
const isLoggedIn = computed(() => !!authState.user)

const filters = computed(() => filtersFromQuery(route.query))
const filterParams = computed(() => filtersToApiParams(filters.value))
const hasActiveFilters = computed(() => countActiveFilters(filters.value) > 0)
const applyFilters = (next: PatternFilters) =>
  router.push({ query: { ...route.query, ...filtersToQuery(next), page: undefined } })
const clearFilters = () =>
  router.push({
    query: {
      ...route.query,
      q: undefined,
      ...filtersToQuery(emptyFilters()),
      page: undefined,
    },
  })
const toggleSize = (draft: PatternFilters, size: PatternSize) => {
  const next = new Set(draft.sizes)
  if (next.has(size)) next.delete(size)
  else next.add(size)
  draft.sizes = PATTERN_SIZES.filter((value) => next.has(value))
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
  } catch (error) {
    tagsError.value =
      error instanceof ApiError ? error.body.message : t('common.errors.tagsLoadFailed')
  } finally {
    tagsLoading.value = false
  }
}

const SORT_OPTIONS = computed<SortOption<PatternSort>[]>(() => [
  { value: 'name_asc', label: t('common.sort.nameAscending') },
  { value: 'name_desc', label: t('common.sort.nameDescending') },
  { value: 'date_desc', label: t('common.sort.newest') },
  { value: 'date_asc', label: t('common.sort.oldest') },
])

const getMeta = (pattern: PatternListItem) => `${formatCardDate(pattern.createdAt)} • ${pattern.size}`
</script>

<template>
  <div class="space-y-6 pb-14">
    <!-- @vue-generic {PatternListItem, PatternSort} -->
    <SelectableResourceList
      path="/patterns"
      noun="patterns"
      details-route-name="PatternDetails"
      :placeholder="$t('optimizations.searchPatterns')"
      :ariaLabel="t('patterns.searchLabel')"
      default-sort="name_asc"
      :sort-options="SORT_OPTIONS"
      :selected-id="store.pattern?.id ?? null"
      :get-meta="getMeta"
      :get-image="(pattern) => pattern.imageUrl"
      :filter-params="filterParams"
      :has-active-filters="hasActiveFilters"
      @select="(pattern) => store.selectPattern({ id: pattern.id, name: pattern.name })"
      @reset-filters="clearFilters"
    >
      <template #filter>
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
            <FilterSection :title="$t('common.filters.size')" :default-open="true">
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="size in PATTERN_SIZES"
                  :key="size"
                  type="button"
                  class="cursor-pointer rounded-md border px-2.5 py-1 text-xs hover:bg-brand-green"
                  :class="draft.sizes.includes(size) ? 'border-foreground bg-brand-green' : 'border-border'"
                  :aria-pressed="draft.sizes.includes(size)"
                  @click="toggleSize(draft, size)"
                >
                  {{ size }}
                </button>
              </div>
            </FilterSection>
          </template>
        </ListFilterPopover>
      </template>
      <template #placeholder><Scissors class="size-8" /></template>
      <template #empty>
        <Scissors class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">{{ $t('optimizations.noPatterns') }}</h2>
        <p class="max-w-xs text-xs text-muted-foreground">
          {{ $t('optimizations.noPatternsDescription') }}
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'PatternNew' }">{{ $t('optimizations.addFirstPattern') }}</RouterLink>
        </Button>
      </template>
    </SelectableResourceList>

    <FormFloatingActions
      :cancel-label="$t('common.actions.cancel')"
      :next-label="$t('common.actions.next')"
      :disabled="!store.pattern"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>
