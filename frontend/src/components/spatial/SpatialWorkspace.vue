<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { ImageOff } from 'lucide-vue-next'
import type { Point2D, PolygonEdge } from '@/types/geometry.ts'
import SpatialCanvas from '../spatial/SpatialCanvas.vue'
import SpatialFloatingToolbar from './SpatialFloatingToolbar.vue'

const spatialCanvasRef = ref<InstanceType<typeof SpatialCanvas> | null>(null)
const showLabels = ref(true)

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    points: Point2D[]
    edges: PolygonEdge[]
    previewPoint?: Point2D | null // preview is during addition of new point
    previewNeighbors?: { p1: Point2D; p2: Point2D } | null
    selectedEdgeIndex?: number | null
    selectedPointIndex?: number | null
    canDelete?: boolean
    zoomLevel?: number
    rotation?: number
    canvasOffset?: { x: number; y: number }
    activeTool?: 'select' | 'pan'
    isMoveMode?: boolean
    isDraggingCanvas?: boolean
    isInteractiveDragging?: boolean
  }>(),
  {
    imageUrl: null,
    previewPoint: null,
    previewNeighbors: null,
    selectedEdgeIndex: null,
    selectedPointIndex: null,
    canDelete: false,
    zoomLevel: 1,
    rotation: 0,
    canvasOffset: () => ({ x: 0, y: 0 }),
    activeTool: 'select',
    isMoveMode: false,
    isDraggingCanvas: false,
    isInteractiveDragging: false
  },
)

const emit = defineEmits<{
  (e: 'imageClick', point: Point2D, event: MouseEvent): void
  (e: 'canvasDragStart', event: MouseEvent): void
  (e: 'update:activeTool', tool: 'select' | 'pan'): void
  (e: 'update:zoomLevel', zoom: number): void
  (e: 'selectEdge', index: number, event: MouseEvent): void
  (e: 'selectPoint', index: number): void
  (e: 'startDragPoint', index: number, event: MouseEvent): void
  (e: 'deleteSelected'): void
  (e: 'cancel'): void
  (e: 'imageLoaded', image: HTMLImageElement): void
}>()


defineExpose({
  getPointFromEvent: (e: MouseEvent) => spatialCanvasRef.value?.getPointFromEvent(e) ?? null,
})
</script>

<template>
  <div
    ref="workspaceRef"
    class="flex-1 w-full h-[520px] max-h-[520px] bg-card border border-muted rounded-md p-4 relative overflow-hidden flex items-center justify-center select-none"
  >
    <div
      v-if="!imageUrl"
      class="flex flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <ImageOff class="h-10 w-10 stroke-1" />
      <p class="text-sm font-medium">No image loaded. Please upload an image first.</p>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">
        Go to upload
      </Button>
    </div>

    <template v-else>
      <SpatialCanvas
        ref="spatialCanvasRef"
        :image-url="props.imageUrl"
        :points="props.points"
        :edges="props.edges"
        :read-only="false"
        :zoom-level="props.zoomLevel"
        :rotation="props.rotation"
        :canvas-offset="props.canvasOffset"
        :show-labels="showLabels"
        :selected-point-index="selectedPointIndex"
        :selected-edge-index="selectedEdgeIndex"
        :preview-point="previewPoint"
        :preview-neighbors="previewNeighbors"
        :is-move-mode="isMoveMode"
        :is-dragging-canvas="isDraggingCanvas"
        :is-interactive-dragging="isInteractiveDragging"
        @update:zoom-level="(z) => emit('update:zoomLevel', z)"
        @canvas-drag-start="(e) => emit('canvasDragStart', e)"
        @click-image="(point, ev) => emit('imageClick', point, ev)"
        @select-point="(idx) => emit('selectPoint', idx)"
        @select-edge="(idx, ev) => emit('selectEdge', idx, ev)"
        @start-drag-point="(idx, ev) => emit('startDragPoint', idx, ev)"
        @image-loaded="(img) => emit('imageLoaded', img)"
      >
        <template #toolbar>
          <SpatialFloatingToolbar
            :active-tool="props.activeTool"
            v-model:show-labels="showLabels"
            :is-move-mode="props.isMoveMode"
            :can-delete="props.canDelete"
            @update:active-tool="(tool) => emit('update:activeTool', tool)"
            @delete-selected="emit('deleteSelected')"
          />
        </template>
      </SpatialCanvas>
    </template>
  </div>
</template>
