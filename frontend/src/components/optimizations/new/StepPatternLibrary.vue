<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Scissors } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import SelectableResourceList from '@/components/common/SelectableResourceList.vue'
import type { SortOption } from '@/composables/useListQuery'
import type { PatternListItem, PatternSort } from '@/types/pattern'
import { formatCardDate } from '@/utils/formatCardDate'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()

const SORT_OPTIONS: SortOption<PatternSort>[] = [
  { value: 'name_asc', label: 'Name (A to Z)' },
  { value: 'name_desc', label: 'Name (Z to A)' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
]

const getMeta = (pattern: PatternListItem) => `${formatCardDate(pattern.createdAt)} • ${pattern.size}`
</script>

<template>
  <div class="space-y-6 pb-14">
    <SelectableResourceList
      path="/patterns"
      noun="patterns"
      details-route-name="PatternDetails"
      placeholder="Search patterns..."
      aria-label="Search patterns"
      default-sort="name_asc"
      :sort-options="SORT_OPTIONS"
      :selected-id="store.pattern?.id ?? null"
      :get-meta="getMeta"
      @select="(pattern) => store.selectPattern({ id: pattern.id, name: pattern.name })"
    >
      <template #placeholder><Scissors class="size-8" /></template>
      <template #empty>
        <Scissors class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">No patterns yet</h2>
        <p class="max-w-xs text-xs text-muted-foreground">
          Upload a pattern first, then come back to optimize it.
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'PatternNew' }">Add your first pattern</RouterLink>
        </Button>
      </template>
    </SelectableResourceList>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="!store.pattern"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>