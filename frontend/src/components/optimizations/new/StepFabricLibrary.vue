<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Shirt } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import SelectableResourceList from '@/components/common/SelectableResourceList.vue'
import type { SortOption } from '@/composables/useListQuery'
import type { FabricListItem, FabricSort } from '@/types/fabric'
import { formatCardDate } from '@/utils/formatCardDate'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()

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
    <SelectableResourceList
      path="/fabrics"
      noun="fabrics"
      details-route-name="FabricDetails"
      placeholder="Search fabrics..."
      aria-label="Search fabrics"
      default-sort="date_desc"
      :sort-options="SORT_OPTIONS"
      :selected-id="store.fabric?.id ?? null"
      :get-meta="getMeta"
      :get-image="getImage"
      @select="(fabric) => store.selectFabric({ id: fabric.id, name: fabric.name })"
    >
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