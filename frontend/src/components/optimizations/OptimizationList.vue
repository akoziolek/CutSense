<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useRoute } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Trash2, Upload } from 'lucide-vue-next'
import ListToolbar from '@/components/common/ListToolbar.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import ResourceList from '@/components/common/ResourceList.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api, ApiError } from '@/api/client'
import { useListQuery, type SortOption } from '@/composables/useListQuery'
import { usePagedList } from '@/composables/usePagedList'
import { formatCardDate } from '@/utils/formatCardDate'
import {
  baseFromQuery, baseToApiParams, baseToQuery, countActive, emptyBaseFilters, type BaseFilters,
} from '@/utils/listFilters'
import type {
  OptimizationListItem, OptimizationListResponse, OptimizationSort, OptimizationSortField,
} from '@/types/optimization'

const emit = defineEmits<{ (e: 'loaded', total: number): void }>()

const PAGE_SIZE = 12
const { t } = useI18n()
const COLUMNS = computed(() => [
  { field: 'name' as const, label: t('optimizations.list.name') },
  { field: 'date' as const, label: t('optimizations.list.date') },
  { field: 'pattern' as const, label: t('optimizations.list.pattern') },
  { field: 'fabric' as const, label: t('optimizations.list.fabric') },
  { field: 'algorithm' as const, label: t('optimizations.list.algorithm') },
])
const SORT_OPTIONS = computed<SortOption<OptimizationSort>[]>(() =>
  COLUMNS.value.flatMap(({ field, label }) =>
    (['asc', 'desc'] as const).map((dir) => ({
      value: `${field}_${dir}` as OptimizationSort,
      label: t(dir === 'asc' ? 'optimizations.list.sortAscending' : 'optimizations.list.sortDescending', { label }),
    })),
  ),
)

const route = useRoute()
const {
  page, sort, search, searchMax, sortModel, goToPage, applyQuery,
  searchInput, flushSearch, clearSearch, resetCriteria,
} = useListQuery<OptimizationSort>({ defaultSort: 'date_desc', sortOptions: SORT_OPTIONS.value })

// ---------- sorting by column headers ----------
const activeField = computed(() => sort.value.split('_')[0] as OptimizationSortField)
const activeDir = computed(() => sort.value.split('_')[1] as 'asc' | 'desc')
const toggleSort = (field: OptimizationSortField) => {
  const dir = activeField.value === field
    ? (activeDir.value === 'asc' ? 'desc' : 'asc')
    : (field === 'date' ? 'desc' : 'asc')
  sortModel.value = `${field}_${dir}` as OptimizationSort
}

// ---------- filters (date range) ----------
const filters = computed(() => baseFromQuery(route.query))
const hasActiveFilters = computed(() => countActive(baseToQuery(filters.value)) > 0)
const applyFilters = (next: BaseFilters) => applyQuery(baseToQuery(next))

// ---------- list ----------
const { data, showSkeleton, error, refetch } = usePagedList<OptimizationListResponse>({
  path: '/optimizations',
  noun: 'optimizations',
  page,
  params: () => {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: String(PAGE_SIZE),
      sort: sort.value,
      ...baseToApiParams(filters.value),
    }
    if (search.value) params.q = search.value
    return params
  },
  sources: [page, sort, search, () => JSON.stringify(filters.value)],
})

watch(data, (value) => value && emit('loaded', value.total))

// ---------- delete ----------
const target = ref<OptimizationListItem | null>(null)
const confirmOpen = ref(false)
const successOpen = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')

const requestDelete = (item: OptimizationListItem) => {
  target.value = item
  deleteError.value = ''
  confirmOpen.value = true
}
const confirmDelete = async () => {
  if (!target.value || isDeleting.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await api<void>(`/optimizations/${target.value.id}`, { method: 'DELETE' })
    confirmOpen.value = false
    successOpen.value = true
  } catch (e) {
    deleteError.value = e instanceof ApiError ? e.body.message : t('common.errors.somethingWentWrongRetry')
  } finally {
    isDeleting.value = false
  }
}
const closeSuccess = () => {
  successOpen.value = false
  target.value = null
  void refetch()
}
</script>

<template>
  <div class="space-y-6">
    <ListToolbar
      v-model:search="searchInput"
      v-model:sort="sortModel"
      :placeholder="t('optimizations.list.search')"
      :ariaLabel="t('optimizations.list.searchLabel')"
      :sort-options="SORT_OPTIONS"
      :show-sort="false"
      :maxlength="searchMax"
      @submit="flushSearch"
      @clear="clearSearch"
    >
      <template #filter>
        <ListFilterPopover
          :model-value="filters"
          :empty-filters="emptyBaseFilters"
          :tags="[]"
          :show-tags="false"
          :show-favourites="false"
          :active="hasActiveFilters"
          @apply="applyFilters"
        />
      </template>
    </ListToolbar>

    <ResourceList
      plain
      noun="optimizations"
      :total="data?.total ?? null"
      :loading="showSkeleton"
      :error="error"
      :has-criteria="search !== '' || hasActiveFilters"
      :page-size="PAGE_SIZE"
      @retry="refetch"
      @reset="resetCriteria"
    >
      <template #empty>
        <Sparkles class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">{{ t('optimizations.list.noSaved') }}</h2>
        <p class="max-w-xs text-xs text-muted-foreground">
          {{ t('optimizations.list.noSavedDescription') }}
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'OptimizationNew' }">{{ t('optimizations.list.newOptimization') }}</RouterLink>
        </Button>
      </template>

      <div class="overflow-hidden rounded-xl border border-muted">
        <Table>
          <TableHeader class="bg-brand-green">
            <TableRow class="hover:bg-transparent">
              <TableHead v-for="col in COLUMNS" :key="col.field">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-1 font-bold font-inter text-foreground"
                  :aria-label="t('optimizations.list.sortBy', { label: col.label })"
                  @click="toggleSort(col.field)"
                >
                  {{ col.label }}
                  <template v-if="activeField === col.field">
                    <ArrowDown v-if="activeDir === 'desc'" class="size-3.5" />
                    <ArrowUp v-else class="size-3.5" />
                  </template>
                  <ArrowUpDown v-else class="size-3.5 opacity-60" />
                </button>
              </TableHead>
              <TableHead class="text-center font-bold font-inter text-foreground">{{ t('optimizations.list.actions') }}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-for="item in data?.items ?? []" :key="item.id" class="bg-brand-grey/60">
              <TableCell class="font-medium">
                <RouterLink
                  :to="{ name: 'OptimizationDetails', params: { id: item.id } }"
                  class="hover:underline"
                >
                  {{ item.name }}
                </RouterLink>
              </TableCell>
              <TableCell>{{ formatCardDate(item.createdAt) }}</TableCell>
              <TableCell>{{ item.patternName }}</TableCell>
              <TableCell>{{ item.fabricName ?? t('optimizations.customDimensions') }}</TableCell>
              <TableCell>{{ item.algorithmName }}</TableCell>
              <TableCell>
                <div class="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    disabled
                    :title="t('comingSoon')"
                    :aria-label="t('optimizations.list.export', { name: item.name })"
                  >
                    <Upload class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                    :aria-label="t('optimizations.list.delete', { name: item.name })"
                    @click="requestDelete(item)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <template #footer>
        <div v-if="data && data.totalPages > 1" class="flex items-center justify-center gap-6 text-sm">
          <Button variant="ghost" size="icon" :disabled="page <= 1" :aria-label="t('common.pagination.previous')" @click="goToPage(page - 1)">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ t('optimizations.list.pageOf', { page, totalPages: data.totalPages }) }}</span>
          <Button variant="ghost" size="icon" :disabled="page >= data.totalPages" :aria-label="t('common.pagination.next')" @click="goToPage(page + 1)">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </template>
    </ResourceList>

    <DeleteDialogs
      :confirm-open="confirmOpen"
      :success-open="successOpen"
      :is-deleting="isDeleting"
      :error="deleteError"
      :title="t('optimizations.list.deleteTitle', { name: target?.name ?? t('optimizations.list.thisOptimization') })"
      :description="t('optimizations.list.deleteDescription')"
      :success-title="t('optimizations.list.deleted')"
      :success-description="t('optimizations.list.deletedDescription')"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
      @close-success="closeSuccess"
    />
  </div>
</template>