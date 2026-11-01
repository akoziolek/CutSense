<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'

const MIN_LABEL_SPACING_PX = 35

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    shapes: Point2D[][]
    hiddenShapes?: boolean[]
    activeShapeIndex?: number
    hoveredShapeIndex?: number | null
    allShapesEdges?: PolygonEdge[][]
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
    drawingPoints?: Point2D[]
    isNearStartPoint?: boolean
  }>(),
  {
    imageUrl: null,
    hiddenShapes: () => [],
    activeShapeIndex: 0,
    hoveredShapeIndex: null,
    allShapesEdges: () => [],
    zoomLevel: 1,
    rotation: 0,
    canvasOffset: () => ({ x: 0, y: 0 }),
    readOnly: false,
    showLabels: true,
    selectedPointIndex: null,
    selectedEdgeIndex: null,
    previewPoint: null,
    previewNeighbors: null,
    isMoveMode: false,
    isDraggingCanvas: false,
    isInteractiveDragging: false,
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
  (e: 'imageLoaded', image: HTMLImageElement): void
  (e: 'clickImage', point: Point2D, event: MouseEvent): void
  (e: 'update:zoomLevel', zoom: number): void
  (e: 'update:canvasOffset', offset: { x: number; y: number }): void
  (e: 'canvasDragStart', event: MouseEvent): void
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

const imageDimensions = ref({ width: 0, height: 0 })

const isDrawingMode = computed(() => Boolean(props.drawingPoints && props.drawingPoints.length > 0))

const handleImageLoad = (e: Event) => {
  const imgElement = e.target as HTMLImageElement
  if (imgElement) {
    imageDimensions.value = {
      width: imgElement.clientWidth || imgElement.naturalWidth,
      height: imgElement.clientHeight || imgElement.naturalHeight,
    }
  }
  emit('imageLoaded', imgElement)
}

const cursorClass = computed(() => {
  if (props.isDraggingCanvas || props.isInteractiveDragging) return 'cursor-grabbing'
  if (props.isMoveMode) return 'cursor-grab'
  if (isDrawingMode.value) return 'cursor-crosshair'
  return 'cursor-default'
})
const visibleLabelsSet = computed(() => {
  const visible = new Set<string>()
  if (!props.showLabels) return visible

  const w = imageDimensions.value.width * props.zoomLevel
  const h = imageDimensions.value.height * props.zoomLevel

  const candidates = props.shapes.flatMap((_, shapeIdx) => {
    if (props.hiddenShapes?.[shapeIdx]) return []

    return (props.allShapesEdges[shapeIdx] || []).map((edge) => ({
      key: `${shapeIdx}-${edge.index}`,
      isSelected: shapeIdx === props.activeShapeIndex && edge.index === props.selectedEdgeIndex,
      len: Math.hypot((edge.p2.pctX - edge.p1.pctX) * w, (edge.p2.pctY - edge.p1.pctY) * h),
      x: ((edge.p1.pctX + edge.p2.pctX) / 200) * w,
      y: ((edge.p1.pctY + edge.p2.pctY) / 200) * h,
    }))
  })

  candidates.sort((a, b) => Number(b.isSelected) - Number(a.isSelected) || b.len - a.len)

  const drawn: { x: number; y: number }[] = []
  for (const cand of candidates) {
    const isFree = !drawn.some((p) => Math.hypot(p.x - cand.x, p.y - cand.y) < MIN_LABEL_SPACING_PX)

    if (cand.isSelected || isFree) {
      visible.add(cand.key)
      drawn.push({ x: cand.x, y: cand.y })
    }
  }

  return visible
})

const isLabelVisible = (shapeIdx: number, edgeIdx: number): boolean => {
  return visibleLabelsSet.value.has(`${shapeIdx}-${edgeIdx}`)
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  // pinch zoom
  if (e.ctrlKey) {
    const zoomDelta = e.deltaY < 0 ? 0.085 : -0.085
    const newZoom = Math.min(Math.max(0.5, props.zoomLevel + zoomDelta), 3.5)
    emit('update:zoomLevel', Number(newZoom.toFixed(2)))
    return
  }
  const maxOffset = 200 * (props.zoomLevel - 0.5)
  const rawOffsetX = props.canvasOffset.x - e.deltaX
  const rawOffsetY = props.canvasOffset.y - e.deltaY

  const clampedX = Math.min(Math.max(rawOffsetX, -maxOffset), maxOffset)
  const clampedY = Math.min(Math.max(rawOffsetY, -maxOffset), maxOffset)

  emit('update:canvasOffset', {
    x: Number(clampedX.toFixed(1)),
    y: Number(clampedY.toFixed(1)),
  })
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

const handleShapeMouseDown = (shapeIdx: number) => {
  if (isDrawingMode.value) return
  emit('activateShape', shapeIdx)
}

const handleEdgeMouseDown = (shapeIdx: number, edgeIdx: number, e: MouseEvent) => {
  if (isDrawingMode.value) return
  emit('activateAndSelectEdge', { shapeIndex: shapeIdx, edgeIndex: edgeIdx, event: e })
}

const handlePointMouseDown = (shapeIdx: number, ptIdx: number, e: MouseEvent) => {
  if (isDrawingMode.value) return
  emit('activateAndDragPoint', { shapeIndex: shapeIdx, pointIndex: ptIdx, event: e })
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
    <div
      v-if="$slots.toolbar && imageUrl"
      class="absolute top-1 right-1 z-50"
      @click.stop
      @mousedown.stop
    >
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
          <g v-for="(shape, shapeIdx) in props.shapes" :key="'shape-' + shapeIdx">
            <polygon
              v-if="shape.length >= 3"
              :points="shape.map((p) => `${p.pctX},${p.pctY}`).join(' ')"
              :class="[
                shapeIdx === activeShapeIndex
                  ? shapeIdx === hoveredShapeIndex
                    ? 'fill-violet-500/30 transition-colors'
                    : 'fill-violet-500/15 transition-colors'
                  : shapeIdx === hoveredShapeIndex
                    ? 'fill-violet-400/25 transition-colors'
                    : 'fill-violet-300/10 transition-colors',
                isDrawingMode ? 'pointer-events-none' : 'cursor-pointer',
              ]"
              :style="{ pointerEvents: isDrawingMode ? 'none' : 'fill' }"
              @mousedown.stop.prevent="handleShapeMouseDown(shapeIdx)"
              @click.stop.prevent
            />

            <g v-for="(p1, pointIdx) in shape" :key="'edge-' + shapeIdx + '-' + pointIdx">
              <!-- invisible line to make the hit spot bigger -->
              <line
                v-if="!readOnly && !isDrawingMode"
                :x1="p1.pctX"
                :y1="p1.pctY"
                :x2="shape[(pointIdx + 1) % shape.length]!.pctX"
                :y2="shape[(pointIdx + 1) % shape.length]!.pctY"
                stroke="transparent"
                stroke-width="10"
                vector-effect="non-scaling-stroke"
                class="cursor-pointer"
                style="pointer-events: stroke"
                @mousedown.stop.prevent="handleEdgeMouseDown(shapeIdx, pointIdx, $event)"
                @click.stop.prevent
              />
              <!-- line that user sees -->
              <line
                :x1="p1.pctX"
                :y1="p1.pctY"
                :x2="shape[(pointIdx + 1) % shape.length]!.pctX"
                :y2="shape[(pointIdx + 1) % shape.length]!.pctY"
                :class="[
                  shapeIdx === activeShapeIndex && selectedEdgeIndex === pointIdx
                    ? 'stroke-violet-600 stroke-2'
                    : shapeIdx === activeShapeIndex
                      ? 'stroke-violet-500 stroke-1.5'
                      : shapeIdx === hoveredShapeIndex
                        ? 'stroke-violet-400 stroke-1.5'
                        : 'stroke-violet-300/60 stroke-1',
                ]"
                vector-effect="non-scaling-stroke"
                class="pointer-events-none transition-colors"
              />
            </g>
          </g>

          <g v-if="!readOnly && previewPoint && props.previewNeighbors">
            <!-- preview line -->
            <line
              :x1="props.previewNeighbors.p1.pctX"
              :y1="props.previewNeighbors.p1.pctY"
              :x2="previewPoint.pctX"
              :y2="previewPoint.pctY"
              stroke="#8b5cf6"
              stroke-width="2"
              stroke-dasharray="4 4"
              vector-effect="non-scaling-stroke"
            />
            <line
              :x1="previewPoint.pctX"
              :y1="previewPoint.pctY"
              :x2="props.previewNeighbors.p2.pctX"
              :y2="props.previewNeighbors.p2.pctY"
              stroke="#8b5cf6"
              stroke-width="2"
              stroke-dasharray="4 4"
              vector-effect="non-scaling-stroke"
            />
          </g>

          <g v-if="props.drawingPoints.length > 0">
            <!-- new shape -->
            <polyline
              v-if="props.drawingPoints.length > 1"
              :points="props.drawingPoints.map((p) => `${p.pctX},${p.pctY}`).join(' ')"
              fill="none"
              class="stroke-violet-600 stroke-2"
              stroke-dasharray="4 4"
              vector-effect="non-scaling-stroke"
            />

            <line
              v-if="props.previewPoint && props.drawingPoints[props.drawingPoints.length - 1]"
              :x1="props.drawingPoints[props.drawingPoints.length - 1]!.pctX"
              :y1="props.drawingPoints[props.drawingPoints.length - 1]!.pctY"
              :x2="props.isNearStartPoint ? props.drawingPoints[0]!.pctX : props.previewPoint.pctX"
              :y2="props.isNearStartPoint ? props.drawingPoints[0]!.pctY : props.previewPoint.pctY"
              class="stroke-violet-500 stroke-1.5"
              stroke-dasharray="2 2"
              vector-effect="non-scaling-stroke"
            />
          </g>
        </svg>

        <!-- LAYER 3 OVERLAY - POINTS, LENGTHS -->
        <div class="absolute inset-0 w-full h-full z-40 pointer-events-none">
          <!-- visible point, reverse transform -->
          <template v-for="(shape, shapeIdx) in props.shapes" :key="'points-group-' + shapeIdx">
            <div
              v-for="(pt, ptIdx) in shape"
              :key="'pt-' + shapeIdx + '-' + ptIdx"
              class="absolute rounded-full border-2 transition-transform"
              :class="[
                readOnly || isDrawingMode
                  ? 'pointer-events-none opacity-60'
                  : 'pointer-events-auto cursor-grab active:cursor-grabbing',
                shapeIdx === activeShapeIndex && selectedPointIndex === ptIdx
                  ? 'w-2.5 h-2.5 border-violet-800 bg-violet-600 ring-2 ring-violet-400/60 z-50 scale-110'
                  : shapeIdx === activeShapeIndex
                    ? 'w-2 h-2 border-violet-600 bg-background hover:scale-125 z-40'
                    : 'w-1.5 h-1.5 border-violet-400/60 bg-muted hover:bg-violet-500 hover:scale-125 z-30',
              ]"
              :style="{
                left: `${pt.pctX}%`,
                top: `${pt.pctY}%`,
                transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
              }"
              @mousedown.stop.prevent="handlePointMouseDown(shapeIdx, ptIdx, $event)"
              @click.stop.prevent
            />

            <template
              v-if="
                props.showLabels && (!props.hiddenShapes?.length || !props.hiddenShapes[shapeIdx])
              "
            >
              <template
                v-for="edge in props.allShapesEdges[shapeIdx] || []"
                :key="'label-' + shapeIdx + '-' + edge.index"
              >
                <div
                  v-if="isLabelVisible(shapeIdx, edge.index)"
                  class="absolute z-40 font-inter font-semibold text-[9px] px-1.5 py-0.5 rounded-full shadow-md border whitespace-nowrap transition-all select-none opacity-95"
                  :class="[
                    shapeIdx === activeShapeIndex && selectedEdgeIndex === edge.index
                      ? 'bg-violet-600 text-white border-violet-500'
                      : shapeIdx === activeShapeIndex
                        ? 'bg-background/90 text-foreground border-border/80'
                        : 'bg-background/70 text-muted-foreground border-border/50',
                    readOnly || isDrawingMode
                      ? 'pointer-events-none'
                      : 'pointer-events-auto cursor-pointer',
                  ]"
                  :style="{
                    left: `${(edge.p1.pctX + edge.p2.pctX) / 2}%`,
                    top: `${(edge.p1.pctY + edge.p2.pctY) / 2}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
                  }"
                  @mousedown.stop.prevent="handleEdgeMouseDown(shapeIdx, edge.index, $event)"
                  @click.stop.prevent
                >
                  {{ edge.distanceCm }} cm
                </div>
              </template>
            </template>
          </template>

          <!-- LAYER 4 - New shape -->
          <template v-if="props.drawingPoints.length > 0">
            <div
              v-for="(pt, idx) in props.drawingPoints"
              :key="'draw-pt-' + idx"
              class="absolute rounded-full transition-all"
              :class="[
                idx === 0 && props.isNearStartPoint
                  ? 'w-3.5 h-3.5 bg-violet-600 ring-4 ring-violet-400/50 z-50 scale-125'
                  : idx === 0
                    ? 'w-3 h-3 bg-violet-600 border-2 border-white z-40'
                    : 'w-2 h-2 bg-violet-500 border border-white z-30',
              ]"
              :style="{
                left: `${pt.pctX}%`,
                top: `${pt.pctY}%`,
                transform: `translate(-50%, -50%) scale(${1 / zoomLevel}) rotate(${-rotation}deg)`,
              }"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
