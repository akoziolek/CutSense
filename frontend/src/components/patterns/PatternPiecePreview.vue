<script setup lang="ts">
import { computed } from 'vue'
import { ZoomIn } from 'lucide-vue-next'
import ImagePreview from '@/components/common/ImagePreview.vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { getGeometryBoundsMm, getPolygonEdges, toImagePixels } from '@/utils/geometry'

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    points: Point2D[]
    shapeIndex?: number
    rotation?: number
    allShapes?: Point2D[][]
    allShapesEdges?: PolygonEdge[][]
    imageWidthMm?: number
    imageHeightMm?: number
    margin?: number
    dimOutside?: boolean
    fill?: boolean
  }>(),
  { margin: 1.05, dimOutside: false, fill: false },
)

const hasRealSize = computed(
  () =>
    !!props.imageWidthMm &&
    props.imageWidthMm > 0 &&
    !!props.imageHeightMm &&
    props.imageHeightMm > 0,
)

const W = computed(() => (hasRealSize.value ? props.imageWidthMm! : 100))
const H = computed(() => (hasRealSize.value ? props.imageHeightMm! : 100))

const resolvedAllShapesEdges = computed<PolygonEdge[][] | undefined>(() => {
  if (props.allShapesEdges?.length) return props.allShapesEdges
  if (!hasRealSize.value) return undefined

  const shapes = props.allShapes?.length ? props.allShapes : [props.points]
  return shapes.map((shape) => getPolygonEdges(shape, props.imageWidthMm!, props.imageHeightMm!))
})

const pts = computed(() => props.points.map((point) => toImagePixels(point, W.value, H.value)))

const fit = (start: number, size: number, limit: number) =>
  size >= limit ? (limit - size) / 2 : Math.min(Math.max(start, 0), limit - size)

const view = computed(() => {
  const p = pts.value
  if (p.length === 0) {
    return { size: Math.min(W.value, H.value), left: 0, top: 0, polygon: '', ringPath: '' }
  }

  const { originMm, widthMm, heightMm } = getGeometryBoundsMm([p.map((pt) => [pt.x, pt.y])])
  const cx = originMm.minX + widthMm / 2
  const cy = originMm.minY + heightMm / 2
  const pieceSize = Math.max(widthMm, heightMm)

  const size = Math.max(pieceSize, Math.min(pieceSize * props.margin, W.value, H.value))
  const ring = p.map((pt) => `${pt.x},${pt.y}`)

  return {
    size,
    left: fit(cx - size / 2, size, W.value),
    top: fit(cy - size / 2, size, H.value),
    polygon: ring.join(' '),
    ringPath: `M${ring.join(' L')} Z`,
  }
})

const viewBoxStr = computed(
  () => `${view.value.left} ${view.value.top} ${view.value.size} ${view.value.size}`,
)
const outsidePath = computed(() => `M0,0 H${W.value} V${H.value} H0 Z ${view.value.ringPath}`)
</script>

<template>
  <ImagePreview
    v-if="imageUrl"
    :src="imageUrl"
    :alt="$t('patterns.piecePreview')"
    :shapes="allShapes || [points]"
    :active-shape-index="shapeIndex"
    :all-shapes-edges="resolvedAllShapesEdges"
  >
    <template #trigger>
      <div
        class="relative group cursor-zoom-in shrink-0 overflow-hidden aspect-square bg-muted/20"
        :class="fill ? 'w-full' : 'w-32 h-32 sm:w-36 sm:h-36 rounded-xl border border-border/40'"
      >
        <svg
          :viewBox="viewBoxStr"
          preserveAspectRatio="none"
          class="w-full h-full block"
          :style="
            rotation
              ? { transformOrigin: '50% 50%', transform: `rotate(${rotation}deg)` }
              : undefined
          "
        >
          <image :href="imageUrl" x="0" y="0" :width="W" :height="H" preserveAspectRatio="none" />
          <path v-if="dimOutside" :d="outsidePath" fill-rule="evenodd" class="fill-black/40" />
          <polygon
            :points="view.polygon"
            class="fill-violet-500/20 stroke-violet-600 stroke-1"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <div
          class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10"
        >
          <span class="rounded-full bg-background/80 p-2 shadow-xs backdrop-blur-xs">
            <ZoomIn class="h-4 w-4 text-foreground" />
          </span>
        </div>
      </div>
    </template>
  </ImagePreview>
</template>
