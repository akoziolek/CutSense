<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card } from '@/components/ui/card'
import OptimizationPreviewToolbar from './OptimizationPreviewToolbar.vue'
import OptimizationPreviewSheet from './OptimizationPreviewSheet.vue'
import type { GeometryOriginMm } from '@/types/geometry'
import type { PlacedPieceViewItem } from '@/types/optimization'
import { useCanvasViewport } from '@/composables/spatial/useCanvasViewport'
import { useOptimizationPieceDrag } from '@/composables/optimization/useOptimizationPieceDrag'
import {
  buildRulerTicks,
  getRulerSteps,
  getCrosshairState,
  getFabricOriginMm,
} from '@/utils/geometry'
import type { PlacementInvalidReason } from '@/types/geometry'

const props = withDefaults(
  defineProps<{
    fabricShape?: [number, number][]
    pieces?: PlacedPieceViewItem[]
    coordinateOriginMm?: GeometryOriginMm
    photoUrl?: string | null
    photoWidthMm?: number | null
    photoHeightMm?: number | null
    canvasWidthMm?: number
    canvasHeightMm?: number
    seamAllowanceMm?: number
    cuttingAllowanceMm?: number
    isExpanded?: boolean
    editable?: boolean
    canUndo?: boolean
    canRedo?: boolean
  }>(),
  {
    fabricShape: () => [],
    pieces: () => [],
    photoUrl: null,
    photoWidthMm: null,
    photoHeightMm: null,
    canvasWidthMm: 1000,
    canvasHeightMm: 1250,
    seamAllowanceMm: 10,
    cuttingAllowanceMm: 5,
    isExpanded: false,
    editable: false,
    canUndo: false,
    canRedo: false,
  },
)

const emit = defineEmits<{
  (e: 'update:isExpanded', value: boolean): void
  (
    e: 'move-piece',
    payload: { index: number; pieceId: number; deltaXMm: number; deltaYMm: number },
  ): void
  (
    e: 'invalid-move',
    payload: { index: number; pieceId: number; reason: PlacementInvalidReason },
  ): void
  (e: 'undo'): void
  (e: 'redo'): void
}>()

const { t } = useI18n()

const workspaceRef = ref<HTMLDivElement | null>(null)

const showAllowances = ref(true)
const showPhoto = ref(true)
const showCoordinates = ref(false)
const showPieceNumbers = ref(true)

const selectedPieceId = ref<number | null>(null)
const cursorCrosshair = ref<ReturnType<typeof getCrosshairState> | null>(null)

const baseWidthPx = computed(() => (props.isExpanded ? 520 : 360))
const baseHeightPx = computed(
  () => baseWidthPx.value * (props.canvasHeightMm / (props.canvasWidthMm || 1)),
)

const updateCoordinates = (clientX: number, clientY: number) => {
  if (!showCoordinates.value || !workspaceRef.value || !sheetMetrics.value.ready) {
    cursorCrosshair.value = null
    return
  }

  cursorCrosshair.value = getCrosshairState({
    clientX,
    clientY,
    containerRect: workspaceRef.value.getBoundingClientRect(),
    sheet: sheetMetrics.value,
    canvasWidthMm: props.canvasWidthMm,
    canvasHeightMm: props.canvasHeightMm,
  })
}

const {
  containerSize,
  zoomLevel,
  canvasOffset,
  isDragging,
  didDrag,
  minZoom,
  maxZoom,
  zoomIn,
  zoomOut,
  resetView,
  handleWheel,
  handleMouseDown,
  handleMouseMove,
  stopDragging,
} = useCanvasViewport({
  containerRef: workspaceRef,
  contentWidth: baseWidthPx,
  contentHeight: baseHeightPx,
  maxZoom: 3.5,
  onPointerMove: updateCoordinates,
  onReset: () => {
    cursorCrosshair.value = null
  },
})

const sheetMetrics = computed(() => {
  const width = baseWidthPx.value * zoomLevel.value
  const height = baseHeightPx.value * zoomLevel.value
  return {
    left: containerSize.value.width / 2 + canvasOffset.value.x - width / 2,
    bottom: containerSize.value.height / 2 + canvasOffset.value.y + height / 2,
    width,
    height,
    ready: containerSize.value.ready,
  }
})

const pxPerMmX = computed(() =>
  props.canvasWidthMm > 0 ? (baseWidthPx.value * zoomLevel.value) / props.canvasWidthMm : 1,
)
const pxPerMmY = computed(() =>
  props.canvasHeightMm > 0 ? (baseHeightPx.value * zoomLevel.value) / props.canvasHeightMm : 1,
)

const effectiveFabricBoundary = computed<[number, number][]>(() => {
  if (props.fabricShape.length >= 3) return props.fabricShape
  return [
    [0, 0],
    [props.canvasWidthMm, 0],
    [props.canvasWidthMm, props.canvasHeightMm],
    [0, props.canvasHeightMm],
  ]
})

const totalAllowanceMm = computed(() => props.seamAllowanceMm + props.cuttingAllowanceMm)

const { draggingPiece, dragValidation, ignoreNextClick, handlePieceMouseDown } =
  useOptimizationPieceDrag({
    editable: toRef(props, 'editable'),
    canUndo: toRef(props, 'canUndo'),
    canRedo: toRef(props, 'canRedo'),
    pieces: toRef(props, 'pieces'),
    fabricBoundary: effectiveFabricBoundary,
    totalAllowanceMm,
    pxPerMmX,
    pxPerMmY,
    onMovePiece: (payload) => emit('move-piece', payload),
    onInvalidMove: (payload) => emit('invalid-move', payload),
    onUndo: () => emit('undo'),
    onRedo: () => emit('redo'),
  })

const coordinateOriginMm = computed(
  () => props.coordinateOriginMm ?? getFabricOriginMm(props.fabricShape),
)

watch(
  () => props.pieces,
  (nextPieces) => {
    if (
      selectedPieceId.value !== null &&
      !nextPieces.some((piece) => piece.id === selectedPieceId.value)
    ) {
      selectedPieceId.value = null
    }
  },
)

watch([() => props.canvasWidthMm, () => props.canvasHeightMm], resetView)

const toggleCoordinates = (nextValue: boolean) => {
  showCoordinates.value = nextValue
  if (!nextValue) cursorCrosshair.value = null
}

const handlePieceClick = (pieceId: number) => {
  if (didDrag.value || ignoreNextClick.value) return
  selectedPieceId.value = selectedPieceId.value === pieceId ? null : pieceId
}

const handleViewportClick = () => {
  if (!didDrag.value && !ignoreNextClick.value && selectedPieceId.value !== null) {
    selectedPieceId.value = null
  }
}

const rulerXSteps = computed(() => getRulerSteps(pxPerMmX.value, 26))
const rulerYSteps = computed(() => getRulerSteps(pxPerMmY.value, 14))

const rulerXTicks = computed(() =>
  sheetMetrics.value.ready
    ? buildRulerTicks({
        viewportSizePx: containerSize.value.width,
        pxPerMm: pxPerMmX.value,
        originPx: sheetMetrics.value.left,
        ...rulerXSteps.value,
      })
    : [],
)

const rulerYTicks = computed(() =>
  sheetMetrics.value.ready
    ? buildRulerTicks({
        viewportSizePx: containerSize.value.height,
        pxPerMm: pxPerMmY.value,
        originPx: sheetMetrics.value.bottom,
        ...rulerYSteps.value,
        invert: true,
      })
    : [],
)

const handleMouseLeave = () => {
  stopDragging()
  cursorCrosshair.value = null
}
</script>

<template>
  <Card
    class="overflow-hidden border border-muted shadow-sm rounded-md gap-0 py-0 font-inter select-none bg-card"
  >
    <OptimizationPreviewToolbar
      :zoom-level="zoomLevel"
      :min-zoom="minZoom"
      :max-zoom="maxZoom"
      :editable="editable"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :show-allowances="showAllowances"
      :show-coordinates="showCoordinates"
      :show-piece-numbers="showPieceNumbers"
      :has-photo="Boolean(photoUrl)"
      :show-photo="showPhoto"
      :is-expanded="isExpanded"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-view="resetView"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @update:show-allowances="showAllowances = $event"
      @update:show-coordinates="toggleCoordinates"
      @update:show-piece-numbers="showPieceNumbers = $event"
      @update:show-photo="showPhoto = $event"
      @update:is-expanded="emit('update:isExpanded', $event)"
    />

    <div
      class="relative w-full h-[460px] max-h-[72vh] bg-card overflow-hidden select-none grid grid-cols-[32px_1fr] grid-rows-[24px_1fr]"
      :class="
        isDragging || draggingPiece
          ? 'cursor-grabbing'
          : showCoordinates
            ? 'cursor-crosshair'
            : 'cursor-default'
      "
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
      @click="handleViewportClick"
    >
      <div
        class="bg-muted/60 border-b border-r border-muted flex items-center justify-center text-[9px] font-mono text-muted-foreground font-bold z-30"
      >
        MM
      </div>

      <div class="relative bg-muted/25 border-b border-muted overflow-hidden z-20">
        <div
          v-for="(tick, idx) in rulerXTicks"
          :key="'rtx-' + idx"
          class="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          :style="{ left: `${tick.px}px` }"
        >
          <span
            v-if="tick.isMajor"
            class="text-[9px] font-mono leading-none text-muted-foreground mb-0.5 select-none"
          >
            {{ tick.label }}
          </span>
          <span class="w-px bg-border" :class="tick.isMajor ? 'h-2' : 'h-1 bg-border/60'" />
        </div>
      </div>

      <div class="relative bg-muted/25 border-r border-muted overflow-hidden z-20">
        <div
          v-for="(tick, idx) in rulerYTicks"
          :key="'rty-' + idx"
          class="absolute right-0 flex items-center pointer-events-none h-0"
          :style="{ top: `${tick.px}px` }"
        >
          <span
            v-if="tick.isMajor"
            class="text-[9px] font-mono leading-none text-muted-foreground mr-1 select-none"
          >
            {{ tick.label }}
          </span>
          <span class="h-px bg-border" :class="tick.isMajor ? 'w-2' : 'w-1 bg-border/60'" />
        </div>
      </div>

      <div
        ref="workspaceRef"
        class="relative w-full h-full overflow-hidden flex items-center justify-center"
        :style="{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: `${pxPerMmX * 100}px ${pxPerMmY * 100}px`,
          backgroundPosition: `${sheetMetrics.left}px ${sheetMetrics.bottom}px`,
        }"
      >
        <div
          class="relative"
          :style="{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`,
          }"
        >
          <OptimizationPreviewSheet
            :fabric-shape="fabricShape"
            :pieces="pieces"
            :coordinate-origin-mm="coordinateOriginMm"
            :photo-url="photoUrl"
            :photo-width-mm="photoWidthMm"
            :photo-height-mm="photoHeightMm"
            :canvas-width-mm="canvasWidthMm"
            :canvas-height-mm="canvasHeightMm"
            :seam-allowance-mm="seamAllowanceMm"
            :cutting-allowance-mm="cuttingAllowanceMm"
            :base-width-px="baseWidthPx"
            :base-height-px="baseHeightPx"
            :zoom-level="zoomLevel"
            :show-allowances="showAllowances"
            :show-photo="showPhoto"
            :show-piece-numbers="showPieceNumbers"
            :editable="editable"
            :selected-piece-id="selectedPieceId"
            :dragging-piece="draggingPiece"
            :is-drag-valid="dragValidation.valid"
            @piece-mousedown="handlePieceMouseDown"
            @piece-click="handlePieceClick"
          />
        </div>

        <svg
          v-if="showCoordinates && cursorCrosshair"
          class="absolute inset-0 h-full w-full pointer-events-none z-40"
        >
          <line
            :x1="0"
            :y1="cursorCrosshair.y"
            :x2="'100%'"
            :y2="cursorCrosshair.y"
            class="stroke-foreground/80 stroke-[0.8] stroke-dasharray-[3_2]"
          />
          <line
            :x1="cursorCrosshair.x"
            :y1="0"
            :x2="cursorCrosshair.x"
            :y2="'100%'"
            class="stroke-foreground/80 stroke-[0.8] stroke-dasharray-[3_2]"
          />
        </svg>

        <div
          v-if="showCoordinates && cursorCrosshair"
          class="absolute z-50 pointer-events-none rounded border border-border bg-popover text-popover-foreground px-2 py-0.5 shadow-md backdrop-blur-xs flex items-center gap-1.5 whitespace-nowrap"
          :class="[
            cursorCrosshair.flipLeft ? '-translate-x-full -ml-3.5' : 'ml-3.5',
            cursorCrosshair.flipTop ? '-translate-y-full -mt-3.5' : 'mt-3.5',
          ]"
          :style="{
            left: `${cursorCrosshair.x}px`,
            top: `${cursorCrosshair.y}px`,
          }"
        >
          <span class="font-mono text-[10px] tracking-tight">X: {{ cursorCrosshair.mmX }} mm</span>
          <span class="text-muted-foreground text-[9px]">•</span>
          <span class="font-mono text-[10px] tracking-tight">Y: {{ cursorCrosshair.mmY }} mm</span>
        </div>
      </div>
    </div>

    <div
      class="border-t border-muted bg-muted/25 px-3 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground transition-opacity"
      :class="showPieceNumbers ? 'opacity-100' : 'opacity-45'"
    >
      <span class="inline-flex items-center gap-1">
        <code
          class="font-mono font-semibold text-foreground bg-background border border-border/80 rounded-xs px-1 py-px text-[9px]"
          >#N</code
        >
        <span>{{ t('optimizations.legendPiece') }}</span>
      </span>
      <span class="inline-flex items-center gap-1">
        <code
          class="font-mono font-semibold text-foreground bg-background border border-border/80 rounded-xs px-1 py-px text-[9px]"
          >M</code
        >
        <span>{{ t('optimizations.legendMirrored') }}</span>
      </span>
      <span class="inline-flex items-center gap-1">
        <code
          class="font-mono font-semibold text-foreground bg-background border border-border/80 rounded-xs px-1 py-px text-[9px]"
          >°</code
        >
        <span>{{ t('optimizations.legendRotated') }}</span>
      </span>
    </div>
  </Card>
</template>
