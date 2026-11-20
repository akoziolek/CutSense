<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Image as ImageIcon,
  ImageOff,
  Eye,
  EyeOff,
  Tag,
} from 'lucide-vue-next'
import type { GeometryOriginMm, Point2D } from '@/types/geometry'
import type { PlacedPieceViewItem } from '@/types/optimization'
import { useNonOverlappingLabels } from '@/composables/spatial/useSpatialLabels'
import { useCanvasViewport } from '@/composables/spatial/useCanvasViewport'
import {
  toSvgPoints,
  offsetPolygonMm,
  buildRulerTicks,
  getFabricOriginMm,
  getPolygonCentroidPct,
  getCartesianDistance,
  toFabricPercent,
} from '@/utils/geometry'

// TODO - display picture, allow moving shapes?
const props = withDefaults(
  defineProps<{
    fabricShape?: [number, number][]
    pieces?: PlacedPieceViewItem[]
    coordinateOriginMm?: GeometryOriginMm
    photoUrl?: string | null
    canvasWidthMm?: number
    canvasHeightMm?: number
    seamAllowanceMm?: number
    cuttingAllowanceMm?: number
    isExpanded?: boolean
  }>(),
  {
    fabricShape: () => [],
    pieces: () => [],
    photoUrl: null,
    canvasWidthMm: 1000,
    canvasHeightMm: 1250,
    seamAllowanceMm: 10,
    cuttingAllowanceMm: 5,
    isExpanded: false,
  },
)

const emit = defineEmits<{
  (e: 'update:isExpanded', value: boolean): void
}>()

const { t } = useI18n()

const workspaceRef = ref<HTMLDivElement | null>(null)

const showAllowances = ref(true)
const showPhoto = ref(true)
const showCoordinates = ref(false)
const showPieceNumbers = ref(true)

const selectedPieceId = ref<number | null>(null)
const hoveredPieceId = ref<number | null>(null)

const cursorCrosshair = ref<{
  x: number
  y: number
  mmX: number
  mmY: number
  flipLeft: boolean
  flipTop: boolean
} | null>(null)

const baseWidthPx = computed(() => (props.isExpanded ? 520 : 360))
const baseHeightPx = computed(
  () => baseWidthPx.value * (props.canvasHeightMm / (props.canvasWidthMm || 1)),
)

const updateCoordinates = (clientX: number, clientY: number) => {
  if (!showCoordinates.value || !workspaceRef.value || !sheetMetrics.value.ready) {
    cursorCrosshair.value = null
    return
  }

  const wRect = workspaceRef.value.getBoundingClientRect()
  const relX = clientX - wRect.left
  const relY = clientY - wRect.top

  cursorCrosshair.value = {
    x: relX,
    y: relY,
    mmX: Math.round(
      ((relX - sheetMetrics.value.left) / sheetMetrics.value.width) * props.canvasWidthMm,
    ),
    mmY: Math.round(
      ((sheetMetrics.value.bottom - relY) / sheetMetrics.value.height) * props.canvasHeightMm,
    ),
    flipLeft: relX > wRect.width - 150,
    flipTop: relY > wRect.height - 48,
  }
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
  const left = containerSize.value.width / 2 + canvasOffset.value.x - width / 2
  const bottom = containerSize.value.height / 2 + canvasOffset.value.y + height / 2

  return {
    left,
    bottom,
    width,
    height,
    ready: containerSize.value.ready,
  }
})

const coordinateOriginMm = computed(
  () => props.coordinateOriginMm ?? getFabricOriginMm(props.fabricShape),
)
const toPctPoint = (point: [number, number]): Point2D =>
  toFabricPercent(point, coordinateOriginMm.value, props.canvasWidthMm, props.canvasHeightMm)

const fabricShapePct = computed<Point2D[]>(() => props.fabricShape.map(toPctPoint))

const formatPieceLabel = (piece: PlacedPieceViewItem): string => {
  const num = piece.pieceNumber ?? piece.id
  const parts = [`#${num}`]
  if (piece.isMirrored) parts.push('M')
  if (piece.rotationAngle && piece.rotationAngle !== 0) parts.push(`${piece.rotationAngle}°`)
  return parts.join('·')
}

const piecesPct = computed(() =>
  props.pieces.map((piece) => {
    const pctPoints = piece.points.map(toPctPoint)
    return {
      id: piece.id,
      patternPieceId: piece.patternPieceId,
      label: formatPieceLabel(piece),
      mmPoints: piece.points,
      pctPoints,
      centerPct: getPolygonCentroidPct(pctPoints),
    }
  }),
)

const selectedPieces = computed(() =>
  piecesPct.value.filter((piece) => piece.id === selectedPieceId.value),
)

watch(
  () => props.pieces,
  () => {
    selectedPieceId.value = null
  },
)

watch([() => props.canvasWidthMm, () => props.canvasHeightMm], resetView)

const toggleCoordinates = () => {
  showCoordinates.value = !showCoordinates.value
  if (!showCoordinates.value) {
    cursorCrosshair.value = null
  }
}

const handlePieceClick = (pieceId: number) => {
  if (didDrag.value) return
  selectedPieceId.value = selectedPieceId.value === pieceId ? null : pieceId
}

const handleViewportClick = () => {
  if (didDrag.value) return
  if (selectedPieceId.value !== null) {
    selectedPieceId.value = null
  }
}

const pxPerMmX = computed(() =>
  props.canvasWidthMm > 0 ? (baseWidthPx.value * zoomLevel.value) / props.canvasWidthMm : 1,
)

const pxPerMmY = computed(() =>
  props.canvasHeightMm > 0 ? (baseHeightPx.value * zoomLevel.value) / props.canvasHeightMm : 1,
)

const minorStepMm = computed(() => (zoomLevel.value >= 2.2 ? 10 : 50))
const majorStepMm = computed(() => {
  if (zoomLevel.value >= 2.2) return 50
  if (zoomLevel.value >= 0.9) return 100
  return 200
})

const rulerXTicks = computed(() => {
  if (!sheetMetrics.value.ready) return []
  return buildRulerTicks({
    viewportSizePx: containerSize.value.width,
    pxPerMm: pxPerMmX.value,
    originPx: sheetMetrics.value.left,
    minorStepMm: minorStepMm.value,
    majorStepMm: majorStepMm.value,
  })
})

const rulerYTicks = computed(() => {
  if (!sheetMetrics.value.ready) return []
  return buildRulerTicks({
    viewportSizePx: containerSize.value.height,
    pxPerMm: pxPerMmY.value,
    originPx: sheetMetrics.value.bottom,
    minorStepMm: minorStepMm.value,
    majorStepMm: majorStepMm.value,
    invert: true,
  })
})

const handleMouseLeave = () => {
  stopDragging()
  cursorCrosshair.value = null
  hoveredPieceId.value = null
}

const getOffsetPolygonPoints = (mmPts: [number, number][], offsetMm: number): string => {
  if (props.canvasWidthMm <= 0 || props.canvasHeightMm <= 0) {
    return toSvgPoints(mmPts.map(toPctPoint))
  }
  return toSvgPoints(offsetPolygonMm(mmPts, offsetMm).map(toPctPoint))
}

const hasSelection = computed(() => selectedPieces.value.length > 0)
const selectedPiecesShapes = computed(() => selectedPieces.value.map((p) => p.pctPoints))

const { isLabelVisible } = useNonOverlappingLabels({
  shapes: selectedPiecesShapes,
  showLabels: hasSelection,
  widthPx: baseWidthPx,
  heightPx: baseHeightPx,
  zoomLevel,
})

const labelItems = computed(() => {
  if (!hasSelection.value) return []
  return selectedPieces.value.flatMap((piece, shapeIdx) => {
    const { mmPoints: mmPts, pctPoints: pctPts } = piece
    if (mmPts.length < 2) return []

    return mmPts.map((p1Mm, edgeIdx) => {
      const p2Mm = mmPts[(edgeIdx + 1) % mmPts.length]!
      const p1Pct = pctPts[edgeIdx]!
      const p2Pct = pctPts[(edgeIdx + 1) % pctPts.length]!

      return {
        key: `${piece.id}-${edgeIdx}`,
        shapeIdx,
        edgeIdx,
        midX: (p1Pct.pctX + p2Pct.pctX) / 2,
        midY: (p1Pct.pctY + p2Pct.pctY) / 2,
        distanceMm: Number(
          getCartesianDistance({ x: p1Mm[0], y: p1Mm[1] }, { x: p2Mm[0], y: p2Mm[1] }).toFixed(1),
        ),
      }
    })
  })
})

const activePatternPieceId = computed(() => {
  const activeId = hoveredPieceId.value ?? selectedPieceId.value
  if (activeId === null) return null
  return props.pieces.find((p) => p.id === activeId)?.patternPieceId ?? null
})

const isSamePatternGroup = (piece: { id: number; patternPieceId?: number }) => {
  if (piece.patternPieceId !== undefined && activePatternPieceId.value !== null) {
    return piece.patternPieceId === activePatternPieceId.value
  }
  return piece.id === hoveredPieceId.value
}
</script>

<template>
  <Card
    class="overflow-hidden border border-muted shadow-sm rounded-md gap-0 py-0 font-inter select-none bg-card"
  >
    <div
      class="bg-brand-green px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-brand-green-foreground"
    >
      <div class="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
          :disabled="zoomLevel <= minZoom"
          :title="t('optimizations.zoomOut')"
          @click="zoomOut"
        >
          <ZoomOut class="h-3.5 w-3.5" />
        </Button>
        <span class="text-[11px] font-mono font-bold px-1.5 min-w-10 text-center">
          {{ Math.round(zoomLevel * 100) }}%
        </span>
        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
          :disabled="zoomLevel >= maxZoom"
          :title="t('optimizations.zoomIn')"
          @click="zoomIn"
        >
          <ZoomIn class="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
          :title="t('optimizations.fitToView')"
          @click="resetView"
        >
          <RotateCcw class="h-3.5 w-3.5" />
        </Button>

        <div class="h-3.5 w-px bg-foreground/20 mx-1" />

        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md transition-colors cursor-pointer"
          :class="
            showAllowances
              ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
              : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
          "
          :title="
            t(showAllowances ? 'optimizations.hideAllowances' : 'optimizations.showAllowances')
          "
          @click="showAllowances = !showAllowances"
        >
          <Layers class="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md transition-colors cursor-pointer"
          :class="
            showCoordinates
              ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
              : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
          "
          :title="
            t(showCoordinates ? 'optimizations.hideCoordinates' : 'optimizations.showCoordinates')
          "
          @click="toggleCoordinates"
        >
          <Eye v-if="showCoordinates" class="h-3.5 w-3.5" />
          <EyeOff v-else class="h-3.5 w-3.5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md transition-colors cursor-pointer"
          :class="
            showPieceNumbers
              ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
              : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
          "
          :title="
            t(showPieceNumbers ? 'optimizations.hidePieceLabels' : 'optimizations.showPieceLabels')
          "
          @click="showPieceNumbers = !showPieceNumbers"
        >
          <Tag class="h-3.5 w-3.5" />
        </Button>

        <Button
          v-if="photoUrl"
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md transition-colors cursor-pointer"
          :class="
            showPhoto
              ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
              : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
          "
          :title="t(showPhoto ? 'optimizations.hidePhoto' : 'optimizations.showPhoto')"
          @click="showPhoto = !showPhoto"
        >
          <ImageIcon v-if="showPhoto" class="h-3.5 w-3.5" />
          <ImageOff v-else class="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
        :title="t(isExpanded ? 'optimizations.collapsePreview' : 'optimizations.expandPreview')"
        @click="emit('update:isExpanded', !isExpanded)"
      >
        <Minimize2 v-if="isExpanded" class="h-3.5 w-3.5" />
        <Maximize2 v-else class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div
      class="relative w-full h-[460px] max-h-[72vh] bg-card overflow-hidden select-none grid grid-cols-[32px_1fr] grid-rows-[24px_1fr]"
      :class="
        isDragging ? 'cursor-grabbing' : showCoordinates ? 'cursor-crosshair' : 'cursor-default'
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
          <div
            class="relative"
            :style="{
              aspectRatio: `${canvasWidthMm} / ${canvasHeightMm}`,
              width: `${baseWidthPx}px`,
            }"
          >
            <img
              v-if="photoUrl && showPhoto"
              :src="photoUrl"
              :alt="t('optimizations.fabricTextureAlt')"
              class="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-40 mix-blend-multiply rounded"
            />

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              class="absolute inset-0 h-full w-full pointer-events-none z-10 overflow-visible"
            >
              <polygon
                v-if="fabricShapePct.length > 2"
                :points="toSvgPoints(fabricShapePct)"
                class="fill-background/90 stroke-foreground/30 stroke-1"
                vector-effect="non-scaling-stroke"
              />

              <g v-if="showAllowances" class="pointer-events-none">
                <g v-for="piece in piecesPct" :key="'allow-' + piece.id">
                  <polygon
                    v-if="cuttingAllowanceMm > 0"
                    :points="
                      getOffsetPolygonPoints(piece.mmPoints, seamAllowanceMm + cuttingAllowanceMm)
                    "
                    class="fill-background/45 stroke-foreground/45 stroke-[0.9]"
                    stroke-dasharray="4 3"
                    stroke-linejoin="bevel"
                    vector-effect="non-scaling-stroke"
                  />

                  <polygon
                    v-if="seamAllowanceMm > 0"
                    :points="getOffsetPolygonPoints(piece.mmPoints, seamAllowanceMm)"
                    class="fill-muted/40 stroke-foreground/20 stroke-[0.8]"
                    stroke-linejoin="bevel"
                    vector-effect="non-scaling-stroke"
                  />
                </g>
              </g>

              <g
                v-for="piece in piecesPct"
                :key="piece.id"
                class="cursor-pointer pointer-events-auto"
                @mouseenter="hoveredPieceId = piece.id"
                @mouseleave="hoveredPieceId = null"
                @click.stop="handlePieceClick(piece.id)"
              >
                <polygon
                  :points="toSvgPoints(piece.pctPoints)"
                  class="transition-colors duration-150"
                  :class="[
                    selectedPieceId === piece.id
                      ? 'fill-brand-green stroke-brand-green-foreground stroke-[1.75]'
                      : isSamePatternGroup(piece)
                        ? 'fill-brand-green/50 stroke-brand-green stroke-[1.5]'
                        : 'fill-muted-foreground/20 stroke-foreground/55 stroke-1',
                  ]"
                  stroke-linejoin="round"
                  vector-effect="non-scaling-stroke"
                />
              </g>
            </svg>

            <div class="absolute inset-0 w-full h-full pointer-events-none z-20">
              <template v-for="piece in piecesPct" :key="'pts-' + piece.id">
                <div
                  v-for="(pt, ptIdx) in piece.pctPoints"
                  :key="ptIdx"
                  class="absolute w-1.5 h-1.5 rounded-full border transition-transform"
                  :class="
                    selectedPieceId === piece.id
                      ? 'bg-brand-green-foreground border-brand-green'
                      : isSamePatternGroup(piece)
                        ? 'bg-brand-green border-brand-green-foreground'
                        : 'border-foreground/45 bg-background opacity-80'
                  "
                  :style="{
                    left: `${pt.pctX}%`,
                    top: `${pt.pctY}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
                  }"
                />
              </template>
            </div>

            <div
              v-if="showPieceNumbers"
              class="absolute inset-0 w-full h-full pointer-events-none z-25"
            >
              <div
                v-for="piece in piecesPct"
                :key="'num-' + piece.id"
                class="absolute font-mono font-semibold text-[9.5px] leading-none px-1.5 py-0.5 rounded-xs border shadow-2xs whitespace-nowrap transition-colors"
                :class="
                  selectedPieceId === piece.id
                    ? 'bg-brand-green-foreground text-brand-green border-brand-green-foreground'
                    : isSamePatternGroup(piece)
                      ? 'bg-brand-green text-brand-green-foreground border-brand-green-foreground/40'
                      : 'bg-background/85 text-foreground/90 border-border/70'
                "
                :style="{
                  left: `${piece.centerPct.pctX}%`,
                  top: `${piece.centerPct.pctY}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
                }"
              >
                {{ piece.label }}
              </div>
            </div>

            <div
              v-if="hasSelection"
              class="absolute inset-0 w-full h-full pointer-events-none z-30"
            >
              <template v-for="lbl in labelItems" :key="lbl.key">
                <div
                  v-if="isLabelVisible(lbl.shapeIdx, lbl.edgeIdx)"
                  class="absolute font-mono font-semibold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs border bg-background/95 text-foreground border-border/80 whitespace-nowrap transition-transform opacity-95"
                  :style="{
                    left: `${lbl.midX}%`,
                    top: `${lbl.midY}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
                  }"
                >
                  {{ lbl.distanceMm }} mm
                </div>
              </template>
            </div>
          </div>
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
