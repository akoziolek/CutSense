<script setup lang="ts">
import { Ruler, Shirt } from 'lucide-vue-next'
import SelectableOptionCard from '@/components/common/SelectableOptionCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      Choose what the pattern pieces will be placed on.
    </p>

    <div class="mx-auto grid max-w-2xl grid-cols-1 gap-6 pb-14 sm:grid-cols-2">
      <SelectableOptionCard
        title="Custom dimensions"
        description="Enter width and length for standard rolls or rectangular sheets."
        :selected="store.fabricSource === 'custom'"
        @select="store.selectFabricSource('custom')"
      >
        <template #icon><Ruler class="size-8" /></template>
      </SelectableOptionCard>

      <SelectableOptionCard
        title="Fabric library"
        description="Pick a pre-configured shape or saved scrap from your library."
        :selected="store.fabricSource === 'library'"
        @select="store.selectFabricSource('library')"
      >
        <template #icon><Shirt class="size-8" /></template>
      </SelectableOptionCard>
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="!store.fabricSource"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>