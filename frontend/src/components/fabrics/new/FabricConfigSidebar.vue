<script setup lang="ts">
import SidebarImageControls from '@/components/spatial/sidebar/SidebarImageControls.vue'
import SidebarThreadDirection from '@/components/spatial/sidebar/SidebarThreadDirection.vue'
import SidebarLineMeasurement from '@/components/spatial/sidebar/SidebarLineMeasurement.vue'

withDefaults(
  defineProps<{
    zoomLevel: number
    threadAngle?: number
    selectedLineDistance: string | null
    hasSelectedLine: boolean
  }>(),
  {
    threadAngle: 0,
  },
)

defineEmits<{
  (e: 'update:zoomLevel', value: number): void
  (e: 'update:threadAngle', value: number): void
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

    <SidebarThreadDirection
      :thread-angle="threadAngle"
      @update:thread-angle="$emit('update:threadAngle', $event)"
    />

    <SidebarLineMeasurement
      :selected-line-distance="selectedLineDistance"
      :has-selected-line="hasSelectedLine"
      @calibrate-line="$emit('calibrateLine', $event)"
      @reset-lines="$emit('resetLines')"
    />
  </div>
</template>
