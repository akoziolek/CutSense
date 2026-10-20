<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ImageOff, Hand, Ruler, Eye, EyeOff, Trash2 } from 'lucide-vue-next'
import type { Point2D, PolygonEdge } from '@/composables/useSpatialWorkspace'

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
const imgRef = ref<HTMLImageElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

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
  workspaceRef,
  imgRef,
  svgRef,
  getPointFromEvent,
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
    <!-- FLOATING TOOLBAR -->
    <div
      v-if="imageUrl"
      class="absolute top-3 right-3 z-50 flex items-center gap-1 bg-background/95 backdrop-blur-md p-1 rounded-md border border-border shadow-md"
    >
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
    </div>

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
      <div class="relative w-full h-full flex items-center justify-center overflow-hidden z-20">
        <!-- translate, scale applied on all layers  -->
        <div
          class="relative inline-flex items-center justify-center transition-transform duration-75 ease-out"
          :style="{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`,
          }"
        >
          <div
            class="relative flex items-center justify-center transition-transform duration-300 ease-in-out"
            :style="{ transform: `rotate(${rotation}deg)` }"
          >
            <!-- LAYER 1 - PHOTO -->
            <img
              ref="imgRef"
              :src="imageUrl"
              alt="Workspace canvas"
              draggable="false"
              class="max-h-[460px] w-auto max-w-full object-contain rounded-md shadow-md block pointer-events-none select-none z-10"
              @load="emit('imageLoaded')"
            />

            <!-- LAYER 2 SHAPE -->
            <svg
              ref="svgRef"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              class="absolute inset-0 w-full h-full z-30 pointer-events-none"
            >
              <polygon
                v-if="points.length >= 3"
                :points="points.map((p) => `${p.pctX},${p.pctY}`).join(' ')"
                class="fill-violet-500/15 stroke-none pointer-events-none"
              />

              <g v-for="edge in edges" :key="'edge-' + edge.index">
                <!-- invisible line to make the hit spot bigger -->
                <line
                  :x1="edge.p1.pctX"
                  :y1="edge.p1.pctY"
                  :x2="edge.p2.pctX"
                  :y2="edge.p2.pctY"
                  stroke="transparent"
                  stroke-width="22"
                  vector-effect="non-scaling-stroke"
                  :class="isMoveMode ? 'cursor-pointer' : 'cursor-crosshair'"
                  style="pointer-events: stroke"
                  @mousedown="emit('selectEdge', edge.index, $event)"
                />
                <!-- line that user sees -->
                <line
                  :x1="edge.p1.pctX"
                  :y1="edge.p1.pctY"
                  :x2="edge.p2.pctX"
                  :y2="edge.p2.pctY"
                  :class="selectedEdgeIndex === edge.index ? 'stroke-violet-500' : 'stroke-primary'"
                  :stroke-width="selectedEdgeIndex === edge.index ? '2' : '1.5'"
                  vector-effect="non-scaling-stroke"
                  class="pointer-events-none"
                />
              </g>

              <g v-if="previewPoint && previewNeighbors">
                <line
                  :x1="previewNeighbors.p1.pctX"
                  :y1="previewNeighbors.p1.pctY"
                  :x2="previewPoint.pctX"
                  :y2="previewPoint.pctY"
                  stroke="#a78bfa"
                  stroke-width="2.5"
                  stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                />
                <line
                  :x1="previewPoint.pctX"
                  :y1="previewPoint.pctY"
                  :x2="previewNeighbors.p2.pctX"
                  :y2="previewNeighbors.p2.pctY"
                  stroke="#a78bfa"
                  stroke-width="2.5"
                  stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                />
              </g>
            </svg>

            <!-- LAYER 3 OVERLAY - POINTS, LENGTHS -->
            <div class="absolute inset-0 w-full h-full z-40 pointer-events-none">
              <!-- visible point, reverse transform -->
              <div
                v-for="(pt, idx) in points"
                :key="'pt-' + idx"
                class="absolute w-2.5 h-2.5 rounded-full border-2 bg-background z-40 pointer-events-auto shadow-md transition-transform hover:scale-125"
                :class="[
                  selectedPointIndex === idx
                    ? 'border-violet-800 bg-violet-600 ring-1 ring-violet-800'
                    : 'border-primary bg-background',
                  isMoveMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                ]"
                :style="{
                  left: `${pt.pctX}%`,
                  top: `${pt.pctY}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
                }"
                @mousedown="emit('startDragPoint', idx, $event)"
                @click.stop="emit('selectPoint', idx)"
              />

              <div
                v-if="previewPoint"
                class="absolute w-3.5 h-3.5 rounded-full border-2 border-violet-500 bg-violet-600 z-50 pointer-events-none shadow-lg"
                :style="{
                  left: `${previewPoint.pctX}%`,
                  top: `${previewPoint.pctY}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
                }"
              />

              <template v-for="edge in edges" :key="'label-' + edge.index">
                <div
                  v-if="showLabels || selectedEdgeIndex === edge.index"
                  class="absolute z-40 font-inter font-semibold text-[9px] px-1.5 py-0.5 rounded-full shadow-md border pointer-events-auto whitespace-nowrap transition-all select-none hover:opacity-100 hover:scale-105"
                  :class="[
                    selectedEdgeIndex === edge.index
                      ? 'bg-violet-600 text-white border-violet-500 opacity-100'
                      : 'bg-background/90 backdrop-blur-xs text-foreground border-border/80 opacity-95',
                    isMoveMode ? 'cursor-pointer' : 'cursor-crosshair',
                  ]"
                  :style="{
                    left: `${(edge.p1.pctX + edge.p2.pctX) / 2}%`,
                    top: `${(edge.p1.pctY + edge.p2.pctY) / 2}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
                  }"
                  @mousedown="emit('selectEdge', edge.index, $event)"
                >
                  {{ edge.distanceCm }} cm
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
