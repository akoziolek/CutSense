<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ImageOff, Hand, Ruler, Eye, EyeOff, Trash2 } from 'lucide-vue-next'
import type { Point2D, PolygonEdge } from '@/types/geometry.ts'
import SpatialCanvas from '../spatial/SpatialCanvas.vue'

const spatialCanvasRef = ref<InstanceType<typeof SpatialCanvas> | null>(null)
const imgRef = computed<HTMLImageElement | null | undefined>(() => spatialCanvasRef.value?.imgRef)
const svgRef = computed<SVGSVGElement | null | undefined>(() => spatialCanvasRef.value?.svgRef)

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
    numCols?: number
    numRows?: number
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
    isInteractiveDragging: false,
    numCols: 10,
    numRows: 8,
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
  (e: 'resetCanvas'): void
  (e: 'cancel'): void
  (e: 'imageLoaded'): void
}>()

const showLabels = ref(true)
const workspaceRef = ref<HTMLDivElement | null>(null)

const cursorClass = computed(() => {
  if (props.isDraggingCanvas || props.isInteractiveDragging) return 'cursor-grabbing'
  if (props.isMoveMode) return 'cursor-grab'
  return 'cursor-default'
})

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const zoomDelta = e.deltaY < 0 ? 0.085 : -0.085
  const newZoom = Math.min(Math.max(0.5, props.zoomLevel + zoomDelta), 3.5)
  emit('update:zoomLevel', Number(newZoom.toFixed(2)))
}

const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 1 || props.isMoveMode) {
    emit('canvasDragStart', e)
  }
}

const getPointFromEvent = (e: MouseEvent): Point2D | null => {
  // Stop if image or SVG elements are not ready in DOM
  if (!imgRef.value || !svgRef.value) return null

  // Get the transformation matrix from SVG to screen pixels
  const svg = svgRef.value
  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  // Get current mouse position in screen pixels
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY

  // Convert screen pixels back to image position (undoes zoom, pan, and rotation)
  const localPt = pt.matrixTransform(ctm.inverse())

  // Return position in % (0-100), keeping it safely inside image bounds
  return {
    pctX: Math.max(0, Math.min(100, Number(localPt.x.toFixed(2)))),
    pctY: Math.max(0, Math.min(100, Number(localPt.y.toFixed(2)))),
  }
}

const handleWorkspaceClick = (e: MouseEvent) => {
  // click blocked when user is in move mode
  if (props.isMoveMode || props.isDraggingCanvas || !imgRef.value) return
  // image boundary
  const imgRect = imgRef.value.getBoundingClientRect()
  // check if it is outside
  if (
    e.clientX < imgRect.left ||
    e.clientX > imgRect.right ||
    e.clientY < imgRect.top ||
    e.clientY > imgRect.bottom
  ) {
    return
  }

  const point = getPointFromEvent(e)
  if (point) {
    emit('imageClick', point, e)
  }
}

defineExpose({
  imgRef,
  svgRef,
  workspaceRef,
  getPointFromEvent,
  spatialCanvasRef,
})
</script>

<template>
  <div
    ref="workspaceRef"
    class="flex-1 w-full h-[520px] max-h-[520px] bg-card border border-muted rounded-md p-4 relative overflow-hidden flex items-center justify-center select-none"
    :class="cursorClass"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @click="handleWorkspaceClick"
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
        @select-point="(idx) => emit('selectPoint', idx)"
        @select-edge="(idx, ev) => emit('selectEdge', idx, ev)"
        @start-drag-point="(idx, ev) => emit('startDragPoint', idx, ev)"
        @image-loaded="emit('imageLoaded')"
      >
        <!-- FLOATING TOOLBAR -->
        <template #toolbar>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-7 w-7 rounded-lg cursor-pointer"
            :class="activeTool === 'select' && !isMoveMode ? 'bg-brand-green text-foreground' : ''"
            title="Ruler tool (Drag line to add point)"
            @click="emit('update:activeTool', 'select')"
          >
            <Ruler class="h-3.5 w-3.5" />
            <span class="sr-only">Ruler tool</span>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-7 w-7 rounded-lg cursor-pointer"
            :class="isMoveMode ? 'bg-brand-green text-foreground' : ''"
            title="Pan tool (Drag image or select line)"
            @click="emit('update:activeTool', 'pan')"
          >
            <Hand class="h-3.5 w-3.5" />
            <span class="sr-only">Pan tool</span>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-7 w-7 rounded-lg cursor-pointer"
            :class="showLabels ? 'bg-brand-green text-foreground' : ''"
            :title="showLabels ? 'Hide length labels' : 'Show length labels'"
            @click="showLabels = !showLabels"
          >
            <Eye v-if="showLabels" class="h-3.5 w-3.5" />
            <EyeOff v-else class="h-3.5 w-3.5" />
            <span class="sr-only">Toggle labels</span>
          </Button>

          <div class="w-px h-4 bg-border mx-0.5" />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-7 w-7 rounded-lg transition-colors cursor-pointer"
            :class="
              canDelete
                ? 'text-destructive hover:bg-destructive/15 hover:text-destructive'
                : 'text-muted-foreground/30 cursor-not-allowed'
            "
            :disabled="!canDelete"
            title="Delete selected point or edge (Delete / Backspace)"
            @click="emit('deleteSelected')"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span class="sr-only">Delete selected</span>
          </Button>
        </template>
      </SpatialCanvas>
    </template>
  </div>
</template>
