<script setup lang="ts">
import { computed, ref, toRef, useId } from 'vue'
import type { GeometryOriginMm, Point2D } from '@/types/geometry'
import type { PlacedPieceViewItem } from '@/types/optimization'
import type { ActivePieceDrag } from '@/composables/optimization/useOptimizationPieceDrag'
import {
  useNonOverlappingLabels,
  useNonOverlappingPoints,
} from '@/composables/spatial/useSpatialLabels'
import {
  toSvgPoints,
  offsetPolygonMm,
  getGeometryBoundsMm,
  getPolygonAreaMm2,
  getPolygonCentroidPct,
  getPolygonEdges,
  getSegmentMidpoint,
  toFabricPercentBoundary,
} from '@/utils/geometry'

const props = defineProps<{
  fabricShape: [number, number][]
  pieces: PlacedPieceViewItem[]
  coordinateOriginMm: GeometryOriginMm
  photoUrl: string | null
  photoWidthMm: number | null
  photoHeightMm: number | null
  canvasWidthMm: number
  canvasHeightMm: number
  seamAllowanceMm: number
  cuttingAllowanceMm: number
  baseWidthPx: number
  baseHeightPx: number
  zoomLevel: number
  showAllowances: boolean
  showPhoto: boolean
  showPieceNumbers: boolean
  editable: boolean
  selectedPieceId: number | null
  draggingPiece: ActivePieceDrag | null
  isDragValid: boolean
}>()

const emit = defineEmits<{
  (e: 'piece-mousedown', piece: PlacedPieceViewItem, event: MouseEvent): void
  (e: 'piece-click', pieceId: number): void
}>()

const hoveredPieceId = ref<number | null>(null)
const piecesClipId = `pieces-clip-${useId()}`

const fabricShapePct = computed<Point2D[]>(() =>
  toFabricPercentBoundary(
    props.fabricShape,
    props.coordinateOriginMm,
    props.canvasWidthMm,
    props.canvasHeightMm,
  ),
)

const getOffsetPolygonPoints = (mmPts: [number, number][], offsetMm: number): string =>
  toSvgPoints(
    toFabricPercentBoundary(
      offsetPolygonMm(mmPts, offsetMm),
      props.coordinateOriginMm,
      props.canvasWidthMm,
      props.canvasHeightMm,
    ),
  )

const hasActivePhoto = computed(() => Boolean(props.photoUrl && props.showPhoto))

const photoRectPct = computed(() => {
  let minX = 0
  let minY = 0
  let maxX = props.canvasWidthMm
  let maxY = props.canvasHeightMm

  if (props.photoWidthMm && props.photoHeightMm) {
    minX = 0
    minY = 0
    maxX = props.photoWidthMm
    maxY = props.photoHeightMm
  } else if (props.fabricShape.length > 0) {
    const bounds = getGeometryBoundsMm([props.fabricShape])
    minX = bounds.originMm.minX
    minY = bounds.originMm.minY
    maxX = bounds.originMm.minX + bounds.widthMm
    maxY = bounds.originMm.minY + bounds.heightMm
  }

  const [topLeft, bottomRight] = toFabricPercentBoundary(
    [
      [minX, maxY],
      [maxX, minY],
    ],
    props.coordinateOriginMm,
    props.canvasWidthMm,
    props.canvasHeightMm,
  )

  if (!topLeft || !bottomRight) {
    return { x: 0, y: 0, width: 100, height: 100 }
  }

  return {
    x: topLeft.pctX,
    y: topLeft.pctY,
    width: Math.max(0, bottomRight.pctX - topLeft.pctX),
    height: Math.max(0, bottomRight.pctY - topLeft.pctY),
  }
})

const formatPieceLabel = (piece: PlacedPieceViewItem): string => {
  const parts = [`#${piece.pieceNumber ?? piece.id}`]
  if (piece.isMirrored) parts.push('M')
  if (piece.rotationAngle && piece.rotationAngle !== 0) parts.push(`${piece.rotationAngle}°`)
  return parts.join('·')
}

const piecesPct = computed(() =>
  props.pieces.map((piece) => {
    const activeDrag = props.draggingPiece?.pieceId === piece.id ? props.draggingPiece : null
    const isInvalidDrag = Boolean(activeDrag?.hasMoved && !props.isDragValid)

    const livePoints: [number, number][] = activeDrag
      ? piece.points.map(([x, y]) => [x + activeDrag.deltaXMm, y + activeDrag.deltaYMm])
      : piece.points

    const pctPoints = toFabricPercentBoundary(
      livePoints,
      props.coordinateOriginMm,
      props.canvasWidthMm,
      props.canvasHeightMm,
    )
    const totalAllowanceMm = props.seamAllowanceMm + props.cuttingAllowanceMm

    return {
      id: piece.id,
      rawPiece: piece,
      isInvalidDrag,
      patternPieceId: piece.patternPieceId,
      label: formatPieceLabel(piece),
      pctPoints,
      svgPoints: toSvgPoints(pctPoints),
      seamAllowanceSvgPoints:
        props.seamAllowanceMm > 0 ? getOffsetPolygonPoints(livePoints, props.seamAllowanceMm) : '',
      cuttingAllowanceSvgPoints:
        props.cuttingAllowanceMm > 0 ? getOffsetPolygonPoints(livePoints, totalAllowanceMm) : '',
      centerPct: getPolygonCentroidPct(pctPoints),
      areaMm2: getPolygonAreaMm2(livePoints),
    }
  }),
)

const selectedPieces = computed(() =>
  piecesPct.value.filter((piece) => piece.id === props.selectedPieceId),
)

const hasSelection = computed(() => selectedPieces.value.length > 0)
const selectedPiecesShapes = computed(() => selectedPieces.value.map((p) => p.pctPoints))
const selectedPiecesEdges = computed(() =>
  selectedPieces.value.map((p) =>
    getPolygonEdges(p.pctPoints, props.canvasWidthMm, props.canvasHeightMm),
  ),
)

// distance labels
const { isLabelVisible } = useNonOverlappingLabels({
  shapes: selectedPiecesShapes,
  edges: selectedPiecesEdges,
  showLabels: hasSelection,
  quantizeZoom: true,
  widthPx: toRef(props, 'baseWidthPx'),
  heightPx: toRef(props, 'baseHeightPx'),
  zoomLevel: toRef(props, 'zoomLevel'),
})

// constraints labels
const pieceLabelPoints = computed(() =>
  piecesPct.value.map((piece) => ({
    key: piece.id,
    point: piece.centerPct,
    weight: piece.areaMm2,
    isPriority: piece.id === props.selectedPieceId || piece.id === hoveredPieceId.value,
  })),
)

const { isVisible: isPieceLabelVisible } = useNonOverlappingPoints({
  points: pieceLabelPoints,
  showLabels: toRef(props, 'showPieceNumbers'),
  quantizeZoom: true,
  widthPx: toRef(props, 'baseWidthPx'),
  heightPx: toRef(props, 'baseHeightPx'),
  zoomLevel: toRef(props, 'zoomLevel'),
})

const labelItems = computed(() =>
  selectedPieces.value.flatMap((piece, shapeIdx) =>
    (selectedPiecesEdges.value[shapeIdx] ?? []).map((edge) => {
      const mid = getSegmentMidpoint(edge.p1, edge.p2, 100, 100)
      return {
        key: `${piece.id}-${edge.index}`,
        shapeIdx,
        edgeIdx: edge.index,
        midX: mid.x,
        midY: mid.y,
        distanceCm: edge.distanceCm,
      }
    }),
  ),
)

const activePatternPieceId = computed(() => {
  const activeId = hoveredPieceId.value ?? props.selectedPieceId
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
  <div
    class="relative"
    :style="{
      aspectRatio: `${canvasWidthMm} / ${canvasHeightMm}`,
      width: `${baseWidthPx}px`,
    }"
  >
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      class="absolute inset-0 h-full w-full pointer-events-none z-10 overflow-visible"
    >
      <defs v-if="photoUrl && piecesPct.length > 0">
        <clipPath :id="piecesClipId" clipPathUnits="userSpaceOnUse">
          <polygon v-for="piece in piecesPct" :key="'clip-' + piece.id" :points="piece.svgPoints" />
        </clipPath>
      </defs>

      <polygon
        v-if="fabricShapePct.length > 2"
        :points="toSvgPoints(fabricShapePct)"
        class="fill-background/90 stroke-foreground/30 stroke-1"
        vector-effect="non-scaling-stroke"
      />

      <g
        v-if="showAllowances && (seamAllowanceMm > 0 || cuttingAllowanceMm > 0)"
        class="pointer-events-none"
      >
        <g v-for="piece in piecesPct" :key="'allow-' + piece.id">
          <polygon
            v-if="piece.cuttingAllowanceSvgPoints"
            :points="piece.cuttingAllowanceSvgPoints"
            :class="
              piece.isInvalidDrag
                ? 'fill-destructive/15 stroke-destructive stroke-[1.2]'
                : 'fill-background/45 stroke-foreground/45 stroke-[0.9]'
            "
            stroke-dasharray="4 3"
            stroke-linejoin="bevel"
            vector-effect="non-scaling-stroke"
          />

          <polygon
            v-if="piece.seamAllowanceSvgPoints"
            :points="piece.seamAllowanceSvgPoints"
            :class="
              piece.isInvalidDrag
                ? 'fill-destructive/10 stroke-destructive/70 stroke-[1]'
                : 'fill-muted/40 stroke-foreground/20 stroke-[0.8]'
            "
            stroke-linejoin="bevel"
            vector-effect="non-scaling-stroke"
          />
        </g>
      </g>

      <image
        v-if="photoUrl && piecesPct.length > 0"
        :href="photoUrl"
        :x="photoRectPct.x"
        :y="photoRectPct.y"
        :width="photoRectPct.width"
        :height="photoRectPct.height"
        preserveAspectRatio="none"
        :clip-path="`url(#${piecesClipId})`"
        class="transition-opacity duration-150"
        :class="showPhoto ? 'opacity-100' : 'opacity-0'"
      />

      <g
        v-for="piece in piecesPct"
        :key="piece.id"
        class="pointer-events-auto"
        :class="
          editable
            ? draggingPiece?.pieceId === piece.id
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-pointer'
        "
        @mouseenter="hoveredPieceId = piece.id"
        @mouseleave="hoveredPieceId = null"
        @mousedown="emit('piece-mousedown', piece.rawPiece, $event)"
        @click.stop="emit('piece-click', piece.id)"
      >
        <polygon
          :points="piece.svgPoints"
          class="transition-colors duration-150"
          :class="[
            piece.isInvalidDrag
              ? 'fill-destructive/40 stroke-destructive stroke-[1.75]'
              : selectedPieceId === piece.id
                ? hasActivePhoto
                  ? 'fill-brand-green/50 stroke-brand-green-foreground stroke-[1.75]'
                  : 'fill-brand-green stroke-brand-green-foreground stroke-[1.75]'
                : isSamePatternGroup(piece)
                  ? hasActivePhoto
                    ? 'fill-brand-green/35 stroke-brand-green stroke-[1.5]'
                    : 'fill-brand-green/50 stroke-brand-green stroke-[1.5]'
                  : hasActivePhoto
                    ? 'fill-transparent stroke-foreground/65 stroke-1'
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
            piece.isInvalidDrag
              ? 'bg-destructive border-destructive'
              : selectedPieceId === piece.id
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

    <div v-if="showPieceNumbers" class="absolute inset-0 w-full h-full pointer-events-none z-25">
      <div
        v-for="piece in piecesPct"
        :key="'num-' + piece.id"
        class="absolute font-mono font-semibold text-[9.5px] leading-none px-1.5 py-0.5 rounded-xs border shadow-2xs whitespace-nowrap transition-[opacity,background-color,color,border-color] duration-150"
        :class="[
          isPieceLabelVisible(piece.id) ? 'opacity-100' : 'opacity-0',
          piece.isInvalidDrag
            ? 'bg-destructive text-destructive-foreground border-destructive'
            : selectedPieceId === piece.id
              ? 'bg-brand-green-foreground text-brand-green border-brand-green-foreground'
              : isSamePatternGroup(piece)
                ? 'bg-brand-green text-brand-green-foreground border-brand-green-foreground/40'
                : 'bg-background/85 text-foreground/90 border-border/70',
        ]"
        :style="{
          left: `${piece.centerPct.pctX}%`,
          top: `${piece.centerPct.pctY}%`,
          transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
        }"
      >
        {{ piece.label }}
      </div>
    </div>

    <div v-if="hasSelection" class="absolute inset-0 w-full h-full pointer-events-none z-30">
      <div
        v-for="lbl in labelItems"
        :key="lbl.key"
        class="absolute font-mono font-semibold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs border bg-background/95 text-foreground border-border/80 whitespace-nowrap transition-opacity duration-150"
        :class="isLabelVisible(lbl.shapeIdx, lbl.edgeIdx) ? 'opacity-95' : 'opacity-0'"
        :style="{
          left: `${lbl.midX}%`,
          top: `${lbl.midY}%`,
          transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
        }"
      >
        {{ lbl.distanceCm }} cm
      </div>
    </div>
  </div>
</template>
