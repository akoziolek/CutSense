import { computed, type Ref } from 'vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { getCartesianDistance, getPointDistance, getSegmentMidpoint } from '@/utils/geometry'

export const MIN_LABEL_SPACING_PX = 35

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
    const visible = new Set<string>()
    if (!options.showLabels.value) return visible

    const activeIdx = options.activeShapeIndex?.value
    if (options.onlyActiveShape && (activeIdx === null || activeIdx === undefined)) {
      return visible
    }

    const effectiveZoom = options.quantizeZoom
      ? Math.round(options.zoomLevel.value * 5) / 5
      : options.zoomLevel.value

    const w = options.widthPx.value * effectiveZoom
    const h = options.heightPx.value * effectiveZoom
    if (!w || !h) return visible

    const candidates: Array<{
      key: string
      isSelected: boolean
      len: number
      x: number
      y: number
    }> = []

    const pushShapeCandidates = (shape: Point2D[], shapeIdx: number) => {
      if (options.hiddenShapes?.value?.[shapeIdx]) return

      const shapeEdges = options.edges?.value?.[shapeIdx]
      if (shapeEdges && shapeEdges.length > 0) {
        shapeEdges.forEach((edge) => {
          candidates.push({
            key: `${shapeIdx}-${edge.index}`,
            isSelected: shapeIdx === activeIdx && edge.index === options.selectedEdgeIndex?.value,
            len: getPointDistance(edge.p1, edge.p2, w, h),
            ...getSegmentMidpoint(edge.p1, edge.p2, w, h),
          })
        })
      } else {
        shape.forEach((p1, idx) => {
          const p2 = shape[(idx + 1) % shape.length]!
          candidates.push({
            key: `${shapeIdx}-${idx}`,
            isSelected: false,
            len: getPointDistance(p1, p2, w, h),
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

    candidates.sort((a, b) => Number(b.isSelected) - Number(a.isSelected) || b.len - a.len)

    const drawn: { x: number; y: number }[] = []
    for (const cand of candidates) {
      const isFree = !drawn.some(
        (p) => getCartesianDistance(p, cand) < MIN_LABEL_SPACING_PX,
      )

      if (cand.isSelected || isFree) {
        visible.add(cand.key)
        drawn.push({ x: cand.x, y: cand.y })
      }
    }

    return visible
  })

  const isLabelVisible = (shapeIdx: number, edgeIdx: number) =>
    visibleLabelsSet.value.has(`${shapeIdx}-${edgeIdx}`)

  return {
    visibleLabelsSet,
    isLabelVisible,
  }
}
