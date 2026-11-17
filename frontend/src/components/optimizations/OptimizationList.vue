<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import ListToolbar from '@/components/common/ListToolbar.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ResourceList from '@/components/common/ResourceList.vue'
import { Button } from '@/components/ui/button'
import { useListQuery, type SortOption } from '@/composables/useListQuery'
import { usePagedList } from '@/composables/usePagedList'
import { formatCardDate } from '@/utils/formatCardDate'
import type {
  OptimizationListItem,
  OptimizationListResponse,
  OptimizationSort,
} from '@/types/optimization'

const PAGE_SIZE = 12
const SORT_OPTIONS: SortOption<OptimizationSort>[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
]

const {
  page,
  sort,
  search,
  searchMax,
  sortModel,
  goToPage,
  searchInput,
  flushSearch,
  clearSearch,
  resetCriteria,
} = useListQuery<OptimizationSort>({ defaultSort: 'date_desc', sortOptions: SORT_OPTIONS })

const { data, showSkeleton, error, refetch } = usePagedList<OptimizationListResponse>({
  path: '/optimizations',
  noun: 'optimizations',
  page,
  params: () => {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: String(PAGE_SIZE),
      sort: sort.value,
    }
    if (search.value) params.q = search.value
    return params
  },
  sources: [page, sort, search],
})

const getMeta = (item: OptimizationListItem) =>
  `${formatCardDate(item.createdAt)} • ${item.patternName}`
</script>

<template>
  <div class="space-y-6">
    <ListToolbar
      v-model:search="searchInput"
      v-model:sort="sortModel"
      placeholder="Search optimizations..."
      ariaLabel="Search optimizations"
      :sort-options="SORT_OPTIONS"
      :maxlength="searchMax"
      @submit="flushSearch"
      @clear="clearSearch"
    />

    <ResourceList
      noun="optimizations"
      :total="data?.total ?? null"
      :loading="showSkeleton"
      :error="error"
      :has-criteria="search !== ''"
      :page-size="PAGE_SIZE"
      @retry="refetch"
      @reset="resetCriteria"
    >
      <template #empty>
        <Sparkles class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">No saved optimizations yet</h2>
        <p class="max-w-xs text-xs text-muted-foreground">
          Run an optimization and save the result to find it here.
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'OptimizationNew' }">New optimization</RouterLink>
        </Button>
      </template>

      <ResourceCard
        v-for="item in data?.items ?? []"
        :key="item.id"
        :to="{ name: 'OptimizationDetails', params: { id: item.id } }"
        :title="item.name"
        :meta="getMeta(item)"
        :image-url="item.imageUrl"
        :is-favourite="false"
        :show-favourite="false"
      >
        <template #placeholder><Sparkles class="size-8" /></template>
      </ResourceCard>

      <template #footer>
        <ListPagination
          v-if="data && data.totalPages > 1"
          :page="page"
          :total="data.total"
          :items-per-page="PAGE_SIZE"
          @update:page="goToPage"
        />
      </template>
    </ResourceList>
  </div>
</template>