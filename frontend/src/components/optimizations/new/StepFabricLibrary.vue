<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Shirt } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import FilterSection from '@/components/common/FilterSection.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import SelectableResourceList from '@/components/common/SelectableResourceList.vue'
import type { SortOption } from '@/composables/useListQuery'
import { api, ApiError } from '@/api/client'
import type { FabricListItem, FabricSort, NameTag } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useRoute, useRouter } from 'vue-router'
import {
  areaRangeError,
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
  type FabricFilters,
} from '@/utils/fabricFilters'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const route = useRoute()
const router = useRouter()

const filters = computed(() => filtersFromQuery(route.query))
const filterParams = computed(() => filtersToApiParams(filters.value))
const hasActiveFilters = computed(() => countActiveFilters(filters.value) > 0)
const applyFilters = (next: FabricFilters) =>
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

const availableTags = ref<NameTag[]>([])
const tagsLoaded = ref(false)
const tagsLoading = ref(false)
const tagsError = ref('')
const loadTags = async () => {
  if (tagsLoaded.value || tagsLoading.value) return
  tagsError.value = ''
  tagsLoading.value = true
  try {
    availableTags.value = await api<NameTag[]>('/fabrics/tags')
    tagsLoaded.value = true
  } catch (error) {
    tagsError.value =
      error instanceof ApiError ? error.body.message : 'Could not load tags. Reopen to retry.'
  } finally {
    tagsLoading.value = false
  }
}

const SORT_OPTIONS: SortOption<FabricSort>[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'area_asc', label: 'Smallest first' },
  { value: 'area_desc', label: 'Biggest first' },
]

const getMeta = (fabric: FabricListItem) =>
  `${formatCardDate(fabric.createdAt)} • ${(fabric.areaMm2 / 1_000_000).toFixed(1)} m²`
const getImage = (fabric: FabricListItem) => fabric.pictureUrl
</script>

<template>
  <div class="space-y-6 pb-14">
    <!-- @vue-generic {FabricListItem, FabricSort} -->
    <SelectableResourceList
      path="/fabrics"
      noun="fabrics"
      details-route-name="FabricDetails"
      placeholder="Search fabrics..."
      ariaLabel="Search fabrics"
      default-sort="date_desc"
      :sort-options="SORT_OPTIONS"
      :selected-id="store.fabric?.id ?? null"
      :get-meta="getMeta"
      :get-image="getImage"
      :filter-params="filterParams"
      :has-active-filters="hasActiveFilters"
      @select="(fabric) => store.selectFabric({ id: fabric.id, name: fabric.name })"
      @reset-filters="clearFilters"
    >
      <template #filter>
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
                      class="h-8 pr-8 text-xs"
                    />
                    <span
                      class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                    >m²</span>
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
                      class="h-8 pr-8 text-xs"
                    />
                    <span
                      class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                    >m²</span>
                  </div>
                </label>
              </div>
            </FilterSection>
          </template>
        </ListFilterPopover>
      </template>
      <template #empty>
        <Shirt class="size-8 text-muted-foreground" />
        <h2 class="text-sm font-bold font-inter">No fabrics yet</h2>
        <p class="max-w-xs text-xs text-muted-foreground">
          Add a fabric to your library or go back and use custom dimensions.
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'AddFabric' }">Add your first fabric</RouterLink>
        </Button>
      </template>
    </SelectableResourceList>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="!store.fabric"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>
