<script
  setup
  lang="ts"
  generic="T extends { id: number; name: string; isFavourite: boolean }, S extends string"
>
import ListToolbar from '@/components/common/ListToolbar.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import ResourceCard from '@/components/common/ResourceCard.vue'
import ResourceList from '@/components/common/ResourceList.vue'
import { useListQuery, type SortOption } from '@/composables/useListQuery'
import { usePagedList } from '@/composables/usePagedList'

interface PagedResponse {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const props = withDefaults(
  defineProps<{
    path: string
    noun: string
    placeholder: string
    ariaLabel: string
    sortOptions: SortOption<S>[]
    defaultSort: S
    detailsRouteName: string
    selectedId: number | null
    getMeta: (item: T) => string
    getImage?: (item: T) => string | undefined
    filterParams?: Record<string, string>
    hasActiveFilters?: boolean
    pageSize?: number
  }>(),
  { filterParams: () => ({}), hasActiveFilters: false, pageSize: 12 },
)

const emit = defineEmits<{
  (e: 'select', item: T): void
  (e: 'reset-filters'): void
}>()

const { page, sort, search, searchMax, sortModel, goToPage, searchInput, flushSearch, clearSearch } =
  useListQuery<S>({ defaultSort: props.defaultSort, sortOptions: props.sortOptions })

const { data, showSkeleton, error, refetch } = usePagedList<PagedResponse>({
  path: props.path,
  noun: props.noun,
  page,
  params: () => {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: String(props.pageSize),
      sort: sort.value,
    }
    if (search.value) params.q = search.value
    Object.assign(params, props.filterParams)
    return params
  },
  sources: [page, sort, search, () => JSON.stringify(props.filterParams)],
})

const resetCriteria = () => {
  emit('reset-filters')
}
</script>

<template>
  <div class="space-y-6">
    <ListToolbar
      v-model:search="searchInput"
      v-model:sort="sortModel"
      :placeholder="placeholder"
      :ariaLabel="ariaLabel"
      :sort-options="sortOptions"
      :maxlength="searchMax"
      @submit="flushSearch"
      @clear="clearSearch"
    >
      <template #filter><slot name="filter" /></template>
    </ListToolbar>

    <!-- only the search is cleared here -->
    <ResourceList
      :noun="noun"
      :total="data?.total ?? null"
      :loading="showSkeleton"
      :error="error"
      :has-criteria="search !== '' || hasActiveFilters"
      :page-size="pageSize"
      @retry="refetch"
      @reset="resetCriteria"
    >
      <template #empty><slot name="empty" /></template>

      <ResourceCard
        v-for="item in data?.items ?? []"
        :key="item.id"
        :to="{ name: detailsRouteName, params: { id: item.id } }"
        :title="item.name"
        :meta="getMeta(item)"
        :image-url="getImage?.(item)"
        :is-favourite="item.isFavourite"
        :show-favourite="false"
        selectable
        :selected="selectedId === item.id"
        @toggle-select="emit('select', item)"
      >
        <template v-if="$slots.placeholder" #placeholder><slot name="placeholder" /></template>
      </ResourceCard>

      <template #footer>
        <ListPagination
          v-if="data && data.totalPages > 1"
          :page="page"
          :total="data.total"
          :items-per-page="pageSize"
          @update:page="goToPage"
        />
      </template>
    </ResourceList>
  </div>
</template>
