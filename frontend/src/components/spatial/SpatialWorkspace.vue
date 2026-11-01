<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { ImageOff } from 'lucide-vue-next'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import SpatialCanvas from './SpatialCanvas.vue'
import SpatialFloatingToolbar from './SpatialFloatingToolbar.vue'

const spatialCanvasRef = ref<InstanceType<typeof SpatialCanvas> | null>(null)
const showLabels = ref(true)

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    shapes: Point2D[][]
    hiddenShapes?: boolean[]
    activeShapeIndex?: number
    hoveredShapeIndex?: number | null
    allShapesEdges?: PolygonEdge[][]
    previewPoint?: Point2D | null
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
    showLabelToggle?: boolean
    drawingPoints?: Point2D[]
    isNearStartPoint?: boolean
  }>(),
  {
    imageUrl: null,
    hiddenShapes: () => [],
    activeShapeIndex: 0,
    hoveredShapeIndex: null,
    allShapesEdges: () => [],
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
    isInteractiveDragging: false,
    showLabelToggle: true,
    drawingPoints: () => [],
    isNearStartPoint: false,
  },
)

const emit = defineEmits<{
  (e: 'activateShape', shapeIndex: number): void
  (
    e: 'activateAndDragPoint',
    payload: { shapeIndex: number; pointIndex: number; event: MouseEvent },
  ): void
  (
    e: 'activateAndSelectEdge',
    payload: { shapeIndex: number; edgeIndex: number; event: MouseEvent },
  ): void
  (e: 'selectPoint', index: number): void
  (e: 'imageClick', point: Point2D, event: MouseEvent): void
  (e: 'canvasDragStart', event: MouseEvent): void
  (e: 'update:activeTool', tool: 'select' | 'pan'): void
  (e: 'update:zoomLevel', zoom: number): void
  (e: 'deleteSelected'): void
  (e: 'cancel'): void
  (e: 'imageLoaded', image: HTMLImageElement): void
  (e: 'update:canvasOffset', offset: { x: number; y: number }): void
}>()

defineExpose({
  getPointFromEvent: (e: MouseEvent) => spatialCanvasRef.value?.getPointFromEvent(e) ?? null,
})
</script>

<template>
  <div
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
        :shapes="props.shapes"
        :hidden-shapes="props.hiddenShapes"
        :active-shape-index="props.activeShapeIndex"
        :hovered-shape-index="props.hoveredShapeIndex"
        :all-shapes-edges="props.allShapesEdges"
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
        :drawing-points="props.drawingPoints"
        :is-near-start-point="props.isNearStartPoint"
        @activate-shape="(idx) => emit('activateShape', idx)"
        @activate-and-drag-point="emit('activateAndDragPoint', $event)"
        @activate-and-select-edge="emit('activateAndSelectEdge', $event)"
        @update:zoom-level="(z) => emit('update:zoomLevel', z)"
        @canvas-drag-start="(e) => emit('canvasDragStart', e)"
        @click-image="(point, ev) => emit('imageClick', point, ev)"
        @image-loaded="(img) => emit('imageLoaded', img)"
        @update:canvas-offset="(offset) => emit('update:canvasOffset', offset)"
      >
        <template #toolbar>
          <SpatialFloatingToolbar
            :active-tool="props.activeTool"
            v-model:show-labels="showLabels"
            :is-move-mode="props.isMoveMode"
            :can-delete="props.canDelete"
            :show-label-toggle="props.showLabelToggle"
            @update:active-tool="(tool) => emit('update:activeTool', tool)"
            @delete-selected="emit('deleteSelected')"
          />
        </template>
      </SpatialCanvas>
    </template>
  </div>
</template>
