<script setup lang="ts">
import SidebarImageControls from '@/components/spatial/sidebar/SidebarImageControls.vue'
import SidebarLineMeasurement from '@/components/spatial/sidebar/SidebarLineMeasurement.vue'

defineProps<{
  zoomLevel: number
  selectedLineDistance: string | null
  hasSelectedLine: boolean
}>()

defineEmits<{
  (e: 'update:zoomLevel', value: number): void
  (e: 'calibrateLine', customCm: number): void
  (e: 'rotate', direction: 'cw' | 'ccw'): void
  (e: 'resetLines'): void
}>()
</script>

<template>
  <div class="w-full lg:w-80 flex flex-col gap-4 shrink-0 select-none">
    <SidebarImageControls
      :zoom-level="zoomLevel"
      @update:zoom-level="$emit('update:zoomLevel', $event)"
      @rotate="$emit('rotate', $event)"
    />

    <SidebarLineMeasurement
      :selected-line-distance="selectedLineDistance"
      :has-selected-line="hasSelectedLine"
      @calibrate-line="$emit('calibrateLine', $event)"
      @reset-lines="$emit('resetLines')"
    />
  </div>
</template>
