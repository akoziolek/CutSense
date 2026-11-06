<script setup lang="ts">
import { Ruler, Shirt } from 'lucide-vue-next'
import { watch } from 'vue'
import SelectableOptionCard from '@/components/common/SelectableOptionCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useAuth } from '@/composables/useAuth'
import { computed } from 'vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()
const { state } = useAuth()
const isLoggedIn = computed(() => state.user !== null)

watch(
  () => state.user,
  (user) => {
    if (!user && store.fabricSource === 'library') {
      store.selectFabricSource('custom')
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      Choose what the pattern pieces will be placed on. Guests can use custom dimensions.
    </p>

    <div
      class="mx-auto grid w-full grid-cols-1 gap-6 pb-14"
      :class="isLoggedIn ? 'max-w-2xl sm:grid-cols-2' : 'max-w-4xl'"
    >
      <SelectableOptionCard
        title="Custom dimensions"
        description="Enter width and length for standard rolls or rectangular sheets."
        :selected="store.fabricSource === 'custom'"
        @select="store.selectFabricSource('custom')"
      >
        <template #icon><Ruler class="size-8" /></template>
      </SelectableOptionCard>

      <SelectableOptionCard
        v-if="state.user"
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
