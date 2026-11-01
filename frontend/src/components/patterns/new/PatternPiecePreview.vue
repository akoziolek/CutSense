<script setup lang="ts">
import { computed } from 'vue'
import { ZoomIn } from 'lucide-vue-next'
import ImagePreview from '@/components/common/ImagePreview.vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'

const props = defineProps<{
  imageUrl?: string | null
  points: Point2D[]
  shapeIndex?: number
  rotation?: number
  allShapes?: Point2D[][]
  allShapesEdges?: PolygonEdge[][]
}>()

const bbox = computed(() => {
  if (!props.points || props.points.length === 0) {
    return { x: 0, y: 0, size: 100 }
  }

  const allXCoords = props.points.map((p) => p.pctX)
  const allYCoords = props.points.map((p) => p.pctY)

  const boxPointLeft = Math.min(...allXCoords)
  const boxPointRight = Math.max(...allXCoords)
  const boxPointTop = Math.min(...allYCoords)
  const boxPointBottom = Math.max(...allYCoords)

  const shapeWidth = Math.max(boxPointRight - boxPointLeft, 0.1)
  const shapeHeight = Math.max(boxPointBottom - boxPointTop, 0.1)

  const largestDimension = Math.max(shapeWidth, shapeHeight)
  let cropSize = Math.min(100, largestDimension * 1.05)
  if (cropSize < largestDimension) {
    cropSize = largestDimension
  }

  const shapeCenterX = (boxPointLeft + boxPointRight) / 2
  const shapeCenterY = (boxPointTop + boxPointBottom) / 2

  let cropX = shapeCenterX - cropSize / 2
  let cropY = shapeCenterY - cropSize / 2

  if (cropX < 0) cropX = 0
  if (cropY < 0) cropY = 0
  if (cropX + cropSize > 100) cropX = 100 - cropSize
  if (cropY + cropSize > 100) cropY = 100 - cropSize

  return {
    x: cropX,
    y: cropY,
    size: cropSize,
  }
})

const viewBoxStr = computed(
  () => `${bbox.value.x} ${bbox.value.y} ${bbox.value.size} ${bbox.value.size}`,
)
const polygonPointsStr = computed(() => props.points.map((p) => `${p.pctX},${p.pctY}`).join(' '))
</script>

<template>
  <ImagePreview
    v-if="imageUrl"
    :src="imageUrl"
    alt="Pattern piece preview"
    :shapes="allShapes || [points]"
    :active-shape-index="shapeIndex"
    :all-shapes-edges="allShapesEdges"
  >
    <template #trigger>
      <div
        class="w-32 h-32 sm:w-36 sm:h-36 shrink-0 overflow-hidden rounded-xl bg-muted/20 border border-border/40 relative group cursor-zoom-in aspect-square"
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
          <image :href="imageUrl" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
          <polygon
            :points="polygonPointsStr"
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
