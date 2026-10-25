<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { defineEmits } from 'vue'

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    points: Point2D[]
    edges?: PolygonEdge[] //optional??
    zoomLevel?: number
    rotation?: number
    canvasOffset?: { x: number; y: number }
    readOnly?: boolean
    showLabels?: boolean
    selectedPointIndex?: number | null
    selectedEdgeIndex?: number | null
    previewPoint?: Point2D | null
    previewNeighbors?: { p1: Point2D; p2: Point2D } | null
    isMoveMode?: boolean
    isDraggingCanvas?: boolean
    isInteractiveDragging?: boolean
  }>(),
  {
    imageUrl: null,
    edges: () => [],
    zoomLevel: 1,
    rotation: 0,
    canvasOffset: () => ({ x: 0, y: 0 }),
    readOnly: true,
    showLabels: true,
    selectedPointIndex: null,
    selectedEdgeIndex: null,
    previewPoint: null,
    previewNeighbors: null,
    isMoveMode: false,
    isDraggingCanvas: false,
    isInteractiveDragging: false,
  },
)

const emit = defineEmits<{
  (e: 'selectPoint', index: number): void
  (e: 'startDragPoint', index: number, event: MouseEvent): void
  (e: 'selectEdge', index: number, event: MouseEvent): void
  (e: 'imageLoaded', image: HTMLImageElement): void
  (e: 'clickImage', point: Point2D, event: MouseEvent): void
  (e: 'update:zoomLevel', zoom: number): void
  (e: 'canvasDragStart', event: MouseEvent): void
}>()

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
  const ctm = svgRef.value.getScreenCTM()
  if (!ctm) return null

  // Get current mouse position in screen pixels
  const pt = svgRef.value.createSVGPoint()
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

const handleCanvasClick = (e: MouseEvent) => {
  if (props.isMoveMode || props.isDraggingCanvas || !imgRef.value) return

  // check if clisk is outside the image boundary
  const imgRect = imgRef.value.getBoundingClientRect()
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
    emit('clickImage', point, e)
  }
}

const handleImageLoad = (e: Event) => {
  const imgElement = e.target as HTMLImageElement
  emit('imageLoaded', imgElement)
}

defineExpose({
  imgRef,
  svgRef,
  getPointFromEvent,
})
</script>

<template>
  <div
    class="relative w-full h-full flex items-center justify-center overflow-hidden z-20"
    :class="cursorClass"
    @click="handleCanvasClick"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
  >
    <div v-if="$slots.toolbar && imageUrl" class="absolute top-1 right-1 z-50">
      <slot name="toolbar" />
    </div>
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
          :src="imageUrl ?? undefined"
          alt="Workspace canvas"
          draggable="false"
          class="max-h-[460px] w-auto max-w-full object-contain rounded-md shadow-md block pointer-events-none select-none z-10"
          @load="handleImageLoad"
        />

        <!-- LAYER 2 - SHAPE -->
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
              v-if="!readOnly"
              :x1="edge.p1.pctX"
              :y1="edge.p1.pctY"
              :x2="edge.p2.pctX"
              :y2="edge.p2.pctY"
              stroke="transparent"
              stroke-width="22"
              vector-effect="non-scaling-stroke"
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

          <g v-if="!readOnly && previewPoint && props.previewNeighbors">
            <line
              :x1="props.previewNeighbors.p1.pctX"
              :y1="props.previewNeighbors.p1.pctY"
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
              :x2="props.previewNeighbors.p2.pctX"
              :y2="props.previewNeighbors.p2.pctY"
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
            class="absolute rounded-full border-2 bg-background z-40 shadow-md transition-transform"
            :class="[
              readOnly
                ? 'w-2 h-2 border-primary bg-primary pointer-events-none'
                : 'w-2.5 h-2.5 pointer-events-auto hover:scale-125 cursor-grab active:cursor-grabbing',
              selectedPointIndex === idx
                ? 'border-violet-800 bg-violet-600 ring-1 ring-violet-800'
                : '',
            ]"
            :style="{
              left: `${pt.pctX}%`,
              top: `${pt.pctY}%`,
              transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
            }"
            @mousedown="!readOnly && emit('startDragPoint', idx, $event)"
            @click.stop="!readOnly && emit('selectPoint', idx)"
          />

          <template v-for="edge in edges" :key="'label-' + edge.index">
            <div
              v-if="showLabels || selectedEdgeIndex === edge.index"
              class="absolute z-40 font-inter font-semibold text-[9px] px-1.5 py-0.5 rounded-full shadow-md border whitespace-nowrap transition-all select-none opacity-95"
              :class="[
                selectedEdgeIndex === edge.index
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-background/90 backdrop-blur-xs text-foreground border-border/80',
                readOnly ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer',
              ]"
              :style="{
                left: `${(edge.p1.pctX + edge.p2.pctX) / 2}%`,
                top: `${(edge.p1.pctY + edge.p2.pctY) / 2}%`,
                transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
              }"
              @mousedown="!readOnly && emit('selectEdge', edge.index, $event)"
            >
              {{ edge.distanceCm }} cm
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
