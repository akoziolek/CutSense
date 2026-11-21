import { computed, type Ref } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import {
  getCartesianDistance,
  getPointDistance,
  getSegmentMidpoint,
  toImagePixels,
} from '@/utils/geometry'

export const MIN_LABEL_SPACING_PX = 35

interface SpatialCandidate<K extends string | number> {
  key: K
  isPriority: boolean
  weight: number
  x: number
  y: number
}

function filterNonOverlapping<K extends string | number>(
  candidates: SpatialCandidate<K>[],
  minSpacingPx = MIN_LABEL_SPACING_PX,
): Set<K> {
  const visible = new Set<K>()
  const sorted = [...candidates].sort(
    (a, b) => Number(b.isPriority) - Number(a.isPriority) || b.weight - a.weight,
  )

  const drawn: { x: number; y: number }[] = []
  for (const cand of sorted) {
    const isFree = !drawn.some((p) => getCartesianDistance(p, cand) < minSpacingPx)
    if (cand.isPriority || isFree) {
      visible.add(cand.key)
      drawn.push({ x: cand.x, y: cand.y })
    }
  }

  return visible
}

export function useNonOverlappingLabels(options: {
  shapes: Ref<Point2D[][]>
  edges?: Ref<PolygonEdge[][] | undefined>
  hiddenShapes?: Ref<boolean[] | undefined>
  activeShapeIndex?: Ref<number | null | undefined>
  selectedEdgeIndex?: Ref<number | null | undefined>
  onlyActiveShape?: boolean
  quantizeZoom?: boolean
  showLabels: Ref<boolean>
  widthPx: Ref<number>
  heightPx: Ref<number>
  zoomLevel: Ref<number>
}) {
  const visibleLabelsSet = computed(() => {
    if (!options.showLabels.value) return new Set<string>()

    const activeIdx = options.activeShapeIndex?.value
    if (options.onlyActiveShape && (activeIdx === null || activeIdx === undefined)) {
      return new Set<string>()
    }

    const effectiveZoom = options.quantizeZoom
      ? Math.round(options.zoomLevel.value * 5) / 5
      : options.zoomLevel.value

    const w = options.widthPx.value * effectiveZoom
    const h = options.heightPx.value * effectiveZoom
    if (!w || !h) return new Set<string>()

    const candidates: SpatialCandidate<string>[] = []

    const pushShapeCandidates = (shape: Point2D[], shapeIdx: number) => {
      if (options.hiddenShapes?.value?.[shapeIdx]) return

      const shapeEdges = options.edges?.value?.[shapeIdx]
      if (shapeEdges && shapeEdges.length > 0) {
        shapeEdges.forEach((edge) => {
          candidates.push({
            key: `${shapeIdx}-${edge.index}`,
            isPriority: shapeIdx === activeIdx && edge.index === options.selectedEdgeIndex?.value,
            weight: getPointDistance(edge.p1, edge.p2, w, h),
            ...getSegmentMidpoint(edge.p1, edge.p2, w, h),
          })
        })
      } else {
        shape.forEach((p1, idx) => {
          const p2 = shape[(idx + 1) % shape.length]!
          candidates.push({
            key: `${shapeIdx}-${idx}`,
            isPriority: false,
            weight: getPointDistance(p1, p2, w, h),
            ...getSegmentMidpoint(p1, p2, w, h),
          })
        })
      }
    }

    if (options.onlyActiveShape && activeIdx !== null && activeIdx !== undefined) {
      const activeShape = options.shapes.value[activeIdx]
      if (activeShape) pushShapeCandidates(activeShape, activeIdx)
    } else {
      options.shapes.value.forEach(pushShapeCandidates)
    }

    return filterNonOverlapping(candidates)
  })

  const isLabelVisible = (shapeIdx: number, edgeIdx: number) =>
    visibleLabelsSet.value.has(`${shapeIdx}-${edgeIdx}`)

  return {
    visibleLabelsSet,
    isLabelVisible,
  }
}

export function useNonOverlappingPoints<K extends string | number>(options: {
  points: Ref<Array<{ key: K; point: Point2D; weight: number; isPriority?: boolean }>>
  showLabels: Ref<boolean>
  widthPx: Ref<number>
  heightPx: Ref<number>
  zoomLevel: Ref<number>
  quantizeZoom?: boolean
  minSpacingPx?: number
}) {
  const visibleKeys = computed(() => {
    if (!options.showLabels.value) return new Set<K>()

    const effectiveZoom = options.quantizeZoom
      ? Math.round(options.zoomLevel.value * 5) / 5
      : options.zoomLevel.value

    const w = options.widthPx.value * effectiveZoom
    const h = options.heightPx.value * effectiveZoom
    if (!w || !h) return new Set<K>()

    const candidates: SpatialCandidate<K>[] = options.points.value.map((item) => ({
      key: item.key,
      isPriority: Boolean(item.isPriority),
      weight: item.weight,
      ...toImagePixels(item.point, w, h),
    }))

    return filterNonOverlapping(candidates, options.minSpacingPx)
  })

  const isVisible = (key: K) => visibleKeys.value.has(key)

  return {
    visibleKeys,
    isVisible,
  }
}
