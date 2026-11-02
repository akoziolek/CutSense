<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import SidebarThreadDirection from '@/components/spatial/sidebar/SidebarThreadDirection.vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import {
  MAX_FABRIC_SIDE_CM,
  MIN_FABRIC_SIDE_CM,
  isValidFabricSideCm,
  parseCm,
} from '@/utils/optimizationConfig'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()

const widthInvalid = computed(
  () => store.customWidthCm !== '' && !isValidFabricSideCm(store.customWidthCm),
)
const heightInvalid = computed(
  () => store.customHeightCm !== '' && !isValidFabricSideCm(store.customHeightCm),
)

const preview = computed(() => {
  if (!store.isFabricConfigured) return null
  return { w: parseCm(store.customWidthCm)!, h: parseCm(store.customHeightCm)! }
})

const fields = [
  { id: 'fabric-width', label: 'Width', model: 'customWidthCm', placeholder: 'e.g. 145' },
  { id: 'fabric-height', label: 'Height', model: 'customHeightCm', placeholder: 'e.g. 290' },
] as const
</script>

<template>
  <div class="space-y-6 pb-14">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div
        class="flex h-80 items-center justify-center rounded-md border border-muted bg-card p-6 shadow-xs"
      >
        <svg
          v-if="preview"
          :viewBox="`0 0 ${preview.w} ${preview.h}`"
          preserveAspectRatio="xMidYMid meet"
          class="h-full w-full"
          role="img"
          :aria-label="`Fabric ${preview.w} by ${preview.h} cm`"
        >
          <rect
            x="0"
            y="0"
            :width="preview.w"
            :height="preview.h"
            class="fill-muted stroke-foreground"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <p v-else class="text-xs text-muted-foreground">Enter the fabric size to see a preview.</p>
      </div>

      <div class="space-y-4">
        <div class="space-y-3 rounded-md border border-muted bg-card p-4 shadow-xs">
          <h3 class="text-xs font-bold font-inter uppercase tracking-wider text-foreground">
            Fabric size
          </h3>

          <div v-for="field in fields" :key="field.id" class="space-y-1">
            <Label :for="field.id" class="text-xs font-medium text-muted-foreground">
              {{ field.label }} <span class="text-destructive">*</span>
            </Label>
            <div class="relative">
              <Input
                :id="field.id"
                type="number"
                step="0.1"
                :min="MIN_FABRIC_SIDE_CM"
                :max="MAX_FABRIC_SIDE_CM"
                :placeholder="field.placeholder"
                :model-value="store[field.model]"
                class="h-9 pr-10 text-sm"
                @update:model-value="(v: string | number) => (store[field.model] = String(v ?? ''))"
              />
              <span
                class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              >
                cm
              </span>
            </div>
          </div>

          <p
            v-if="widthInvalid || heightInvalid"
            class="text-xs text-destructive"
            role="alert"
          >
            Enter sizes between {{ MIN_FABRIC_SIDE_CM }} and {{ MAX_FABRIC_SIDE_CM }} cm.
          </p>
          <p class="text-xs text-destructive">* Required field</p>
        </div>

        <!-- fixed for custom sheets: the thread runs along the length -->
        <div
          inert
          aria-disabled="true"
          class="pointer-events-none select-none opacity-70"
          title="Thread direction cannot be changed for custom dimensions"
        >
          <SidebarThreadDirection :thread-angle="0" />
        </div>
      </div>
    </div>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Next"
      :disabled="!store.isFabricConfigured"
      @cancel="emit('cancel')"
      @next="emit('next')"
    />
  </div>
</template>