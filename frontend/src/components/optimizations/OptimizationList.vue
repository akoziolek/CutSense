<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import ListToolbar from '@/components/common/ListToolbar.vue'
import ListFilterPopover from '@/components/common/ListFilterPopover.vue'
import FilterSection from '@/components/common/FilterSection.vue'
import FilterMultiSelect from '@/components/common/FilterMultiSelect.vue'
import ResourceList from '@/components/common/ResourceList.vue'
import DeleteDialogs from '@/components/common/DeleteDialogs.vue'
import SelectableRow from '@/components/common/SelectableRow.vue'
import BulkDeleteControls from '@/components/common/BulkDeleteControls.vue'
import SaveOptimizationModal from '@/components/optimizations/SaveOptimizationModal.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useListQuery } from '@/composables/lists/useListQuery'
import type { SortOption } from '@/types/common'
import { usePagedList } from '@/composables/lists/usePagedList'
import { useSelection } from '@/composables/lists/useSelection'
import { formatCardDate } from '@/utils/formatCardDate'
import {
  countActiveFilters,
  emptyFilters,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery,
} from '@/utils/filters/optimizationFilters'
import type {
  OptimizationFilters,
  OptimizationListItem,
  OptimizationListResponse,
  OptimizationSort,
  OptimizationSortField,
} from '@/types/optimization'
import { useOptimizations } from '@/composables/lists/useOptimizations'

const emit = defineEmits<{
  (e: 'loaded', total: number): void
  (e: 'update:selectionMode', value: boolean): void
}>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const handleRowClick = (id: number) => {
  if (selectionMode.value) return
  if (window.getSelection()?.toString()) return
  router.push({ name: 'OptimizationDetails', params: { id } })
}

const PAGE_SIZE = 12
const COLUMNS: { field: OptimizationSortField; labelKey: string }[] = [
  { field: 'name', labelKey: 'optimizations.list.name' },
  { field: 'date', labelKey: 'optimizations.list.date' },
  { field: 'pattern', labelKey: 'optimizations.list.pattern' },
  { field: 'fabric', labelKey: 'optimizations.list.fabric' },
  { field: 'algorithm', labelKey: 'optimizations.list.algorithm' },
]
// sorting is done via the column headers, so these labels are never displayed
const SORT_OPTIONS: SortOption<OptimizationSort>[] = COLUMNS.flatMap(({ field }) =>
  (['asc', 'desc'] as const).map((dir) => {
    const value = `${field}_${dir}` as OptimizationSort
    return { value, label: value }
  }),
)

const {
  page,
  sort,
  search,
  searchMax,
  sortModel,
  goToPage,
  applyQuery,
  searchInput,
  flushSearch,
  clearSearch,
  resetCriteria,
} = useListQuery<OptimizationSort>({ defaultSort: 'date_desc', sortOptions: SORT_OPTIONS })

const {
  options,
  optionsLoading,
  optionsError,
  loadOptions,
  resetOptions,
  isDeleting,
  deleteError,
  deleteOptimization,
  isRenaming,
  renameError,
  renameOptimization,
} = useOptimizations()

// ---------- sorting by column headers ----------
const activeField = computed(() => sort.value.split('_')[0] as OptimizationSortField)
const activeDir = computed(() => sort.value.split('_')[1] as 'asc' | 'desc')
const toggleSort = (field: OptimizationSortField) => {
  const dir =
    activeField.value === field
      ? activeDir.value === 'asc'
        ? 'desc'
        : 'asc'
      : field === 'date'
        ? 'desc'
        : 'asc'
  sortModel.value = `${field}_${dir}` as OptimizationSort
}

// ---------- filters ----------
const filters = computed(() => filtersFromQuery(route.query))
const hasActiveFilters = computed(() => countActiveFilters(filters.value) > 0)
const applyFilters = (next: OptimizationFilters) => applyQuery(filtersToQuery(next))

const sectionTitle = (label: string, count: number) =>
  count ? t('common.filters.selectedCount', { label, count }) : label

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

// ---------- selection (right click / long press) ----------
const contentRef = ref<HTMLElement | null>(null)
const { selectionMode, selectedIds, isSelected, toggleSelect, selectFromGesture, stopSelecting } =
  useSelection(contentRef)

const showTrash = computed(() => (data.value?.total ?? 0) > 0)
const onBulkDeleted = () => {
  stopSelecting()
  resetOptions()
  void refetch()
}
watch([page, sort, search, () => JSON.stringify(filters.value)], stopSelecting)

// ---------- list ----------
const { data, showSkeleton, error, refetch } = usePagedList<OptimizationListResponse>({
  path: '/optimizations',
  noun: t('optimizations.plural'),
  page,
  params: () => {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: String(PAGE_SIZE),
      sort: sort.value,
      ...filtersToApiParams(filters.value),
    }
    if (search.value) params.q = search.value
    return params
  },
  sources: [page, sort, search, () => JSON.stringify(filters.value)],
})

watch(data, (value) => value && emit('loaded', value.total))
watch(selectionMode, (value) => emit('update:selectionMode', value))

const target = ref<OptimizationListItem | null>(null)
const confirmOpen = ref(false)
const successOpen = ref(false)

const requestDelete = (item: OptimizationListItem) => {
  target.value = item
  deleteError.value = ''
  confirmOpen.value = true
}

const confirmDelete = async () => {
  if (!target.value) return
  const ok = await deleteOptimization(target.value.id)
  if (ok) {
    confirmOpen.value = false
    successOpen.value = true
  }
}

const closeSuccess = () => {
  successOpen.value = false
  target.value = null
  resetOptions()
  void refetch()
}

const editTarget = ref<OptimizationListItem | null>(null)
const editOpen = ref(false)

const requestEdit = (item: OptimizationListItem) => {
  editTarget.value = item
  renameError.value = ''
  editOpen.value = true
}

const handleRename = async (name: string) => {
  if (!editTarget.value) return
  const ok = await renameOptimization(editTarget.value.id, name)
  if (ok) {
    editOpen.value = false
    editTarget.value = null
    await refetch()
  }
}
</script>

<template>
  <div ref="contentRef" class="space-y-6">
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
          :empty-filters="emptyFilters"
          :tags="[]"
          :show-tags="false"
          :show-favourites="false"
          :active="hasActiveFilters"
          @apply="applyFilters"
          @opened="loadOptions"
        >
          <template #default="{ draft }">
            <FilterSection
              :title="sectionTitle(t('optimizations.list.pattern'), draft.patternIds.length)"
              :default-open="false"
            >
              <FilterMultiSelect
                v-model="draft.patternIds"
                :options="options?.patterns ?? []"
                :loading="optionsLoading"
                :error="optionsError"
                :placeholder="t('patterns.search')"
              />
            </FilterSection>

            <FilterSection
              :title="sectionTitle(t('optimizations.list.fabric'), draft.fabricIds.length)"
              :default-open="false"
            >
              <FilterMultiSelect
                v-model="draft.fabricIds"
                :options="options?.fabrics ?? []"
                :loading="optionsLoading"
                :error="optionsError"
                :placeholder="t('fabrics.search')"
              />
            </FilterSection>

            <FilterSection
              :title="sectionTitle(t('optimizations.list.algorithm'), draft.algorithmIds.length)"
              :default-open="false"
            >
              <p v-if="optionsError" class="text-xs text-destructive" role="alert">
                {{ optionsError }}
              </p>
              <div class="space-y-2">
                <div
                  v-for="algorithm in options?.algorithms ?? []"
                  :key="algorithm.id"
                  class="flex items-center gap-2"
                >
                  <Checkbox
                    :id="`filter-algorithm-${algorithm.id}`"
                    :model-value="draft.algorithmIds.includes(algorithm.id)"
                    @update:model-value="
                      draft.algorithmIds = toggleId(draft.algorithmIds, algorithm.id)
                    "
                  />
                  <Label
                    :for="`filter-algorithm-${algorithm.id}`"
                    class="cursor-pointer text-xs font-normal"
                  >
                    {{ algorithm.name }}
                  </Label>
                </div>
              </div>
            </FilterSection>
          </template>
        </ListFilterPopover>
      </template>
    </ListToolbar>

    <ResourceList
      plain
      :noun="t('optimizations.plural')"
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
          <RouterLink :to="{ name: 'OptimizationNew' }">
            {{ t('optimizations.list.newOptimization') }}
          </RouterLink>
        </Button>
      </template>

      <div class="overflow-hidden rounded-md border border-muted">
        <Table>
          <TableHeader class="bg-brand-green">
            <TableRow class="hover:bg-transparent">
              <TableHead v-for="col in COLUMNS" :key="col.field" class="first:pl-4 sm:first:pl-6">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-1 font-bold font-inter text-foreground"
                  :aria-label="t('optimizations.list.sortBy', { label: t(col.labelKey) })"
                  @click="toggleSort(col.field)"
                >
                  {{ t(col.labelKey) }}
                  <template v-if="activeField === col.field">
                    <ArrowDown v-if="activeDir === 'desc'" class="size-3.5" />
                    <ArrowUp v-else class="size-3.5" />
                  </template>
                  <ArrowUpDown v-else class="size-3.5 opacity-60" />
                </button>
              </TableHead>
              <TableHead class="pr-4 sm:pr-6 font-bold font-inter text-foreground">
                <span class="inline-flex items-center">
                  {{ t('optimizations.list.actions') }}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <SelectableRow
              v-for="item in data?.items ?? []"
              :key="item.id"
              :selectable="selectionMode"
              :selected="isSelected(item.id)"
              class="cursor-pointer"
              @click="handleRowClick(item.id)"
              @toggle-select="toggleSelect(item.id)"
              @long-press="selectFromGesture(item.id)"
              @contextmenu.prevent="selectFromGesture(item.id)"
            >
              <TableCell class="pl-4 sm:pl-6 font-medium">
                {{ item.name }}
              </TableCell>
              <TableCell>{{ formatCardDate(item.createdAt) }}</TableCell>
              <TableCell>{{ item.patternName }}</TableCell>
              <TableCell>{{ item.fabricName ?? t('optimizations.customDimensions') }}</TableCell>
              <TableCell>{{ item.algorithmName }}</TableCell>
              <TableCell class="pr-4 sm:pr-6">
                <div class="-ml-2 flex items-center gap-1" @click.stop @pointerdown.stop>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    :disabled="selectionMode"
                    :aria-label="t('optimizations.list.edit', { name: item.name })"
                    @click="requestEdit(item)"
                  >
                    <Pencil class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                    :disabled="selectionMode"
                    :aria-label="t('optimizations.list.delete', { name: item.name })"
                    @click="requestDelete(item)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </SelectableRow>
          </TableBody>
        </Table>
      </div>

      <template #footer>
        <div
          v-if="data && data.totalPages > 1"
          class="flex items-center justify-center gap-6 text-sm"
        >
          <Button
            variant="ghost"
            size="icon"
            :disabled="page <= 1"
            :aria-label="t('common.pagination.previous')"
            @click="goToPage(page - 1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ t('optimizations.list.pageOf', { page, totalPages: data.totalPages }) }}</span>
          <Button
            variant="ghost"
            size="icon"
            :disabled="page >= data.totalPages"
            :aria-label="t('common.pagination.next')"
            @click="goToPage(page + 1)"
          >
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
      :title="
        t('optimizations.list.deleteTitle', {
          name: target?.name ?? t('optimizations.list.thisOptimization'),
        })
      "
      :description="t('optimizations.list.deleteDescription')"
      :success-title="t('optimizations.list.deleted')"
      :success-description="t('optimizations.list.deletedDescription')"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
      @close-success="closeSuccess"
    />

    <BulkDeleteControls
      base-path="/optimizations"
      noun="optimization"
      :ids="selectedIds"
      :visible="showTrash"
      :description="t('optimizations.list.deleteDescription')"
      :success-description="(count: number) => t('optimizations.list.bulkDeleted', { count })"
      @cancelled="stopSelecting"
      @finished="onBulkDeleted"
    />

    <SaveOptimizationModal
      v-model:open="editOpen"
      :initial-name="editTarget?.name"
      :loading="isRenaming"
      :error="renameError"
      :title="t('optimizations.editTitle')"
      :description="t('optimizations.editDescription')"
      :confirm-label="t('common.actions.save')"
      @save="handleRename"
    />
  </div>
</template>
