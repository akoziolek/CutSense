<script setup lang="ts">
import { computed, useId } from 'vue'

export interface PlacementItem {
  patternPieceId?: number
  x: number
  y: number
  rotationAngle?: number
  polygon?: [number, number][]
}

const props = defineProps<{
  placements: PlacementItem[]
  imageUrl?: string
  fabricWidthMm?: number
  fabricLengthMm?: number
  fabricBoundary?: [number, number][]
}>()

const clipPathId = useId()

// 1. Process shapes and extract absolute polygon coordinates
const processedShapes = computed(() => {
  return props.placements.map((p) => {
    let points: [number, number][] = []

    if (p.polygon && p.polygon.length > 0) {
      points = p.polygon
    } else {
      // Fallback rectangle if polygon array is empty
      const w = 150
      const h = 150
      points = [
        [p.x, p.y],
        [p.x + w, p.y],
        [p.x + w, p.y + h],
        [p.x, p.y + h],
      ]
    }

    return {
      id: p.patternPieceId,
      points,
    }
  })
})

const fabricClipPoints = computed(() => {
  if (props.fabricBoundary?.length) return props.fabricBoundary
  if (props.fabricWidthMm && props.fabricLengthMm) {
    return [
      [0, 0],
      [props.fabricWidthMm, 0],
      [props.fabricWidthMm, props.fabricLengthMm],
      [0, props.fabricLengthMm],
    ] as [number, number][]
  }
  return []
})

// Keep the viewport fixed to the fabric when available so out-of-bounds pieces
// cannot change the apparent fabric-to-piece scale.
const bbox = computed(() => {
  const points =
    fabricClipPoints.value.length > 0
      ? fabricClipPoints.value
      : processedShapes.value.flatMap((shape) => shape.points)
  if (points.length === 0) {
    return { x: 0, y: 0, w: 1000, h: 1000, cx: 500, cy: 500 }
  }

  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const w = Math.max(maxX - minX, 50)
  const h = Math.max(maxY - minY, 50)
  const padX = w * 0.05
  const padY = h * 0.05

  return {
    x: minX - padX,
    y: minY - padY,
    w: w + padX * 2,
    h: h + padY * 2,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
})

const viewBoxStr = computed(() => `${bbox.value.x} ${bbox.value.y} ${bbox.value.w} ${bbox.value.h}`)

const formatPoints = (points: [number, number][]) => points.map(([x, y]) => `${x},${y}`).join(' ')
</script>

<template>
  <div
    class="w-full aspect-square relative rounded-xl border border-border bg-background overflow-hidden p-2"
  >
    <svg
      v-if="
        props.placements.length > 0 ||
        props.fabricBoundary?.length ||
        (props.imageUrl && props.fabricWidthMm && props.fabricLengthMm)
      "
      :viewBox="viewBoxStr"
      preserveAspectRatio="xMidYMid meet"
      class="w-full h-full block"
    >
      <defs v-if="fabricClipPoints.length">
        <clipPath :id="clipPathId" clipPathUnits="userSpaceOnUse">
          <polygon :points="formatPoints(fabricClipPoints)" />
        </clipPath>
      </defs>
      <!-- Scale (1, -1) flips Y vertically around the center of the bounding box -->
      <g :transform="`scale(1, -1)`" :transform-origin="`${bbox.cx} ${bbox.cy}`">
        <g :clip-path="fabricClipPoints.length ? `url(#${clipPathId})` : undefined">
          <image
            v-if="props.imageUrl && props.fabricWidthMm && props.fabricLengthMm"
            :href="props.imageUrl"
            x="0"
            :y="-props.fabricLengthMm"
            :width="props.fabricWidthMm"
            :height="props.fabricLengthMm"
            transform="scale(1, -1)"
            preserveAspectRatio="none"
            opacity="0.55"
          />
          <polygon
            v-for="(shape, idx) in processedShapes"
            :key="idx"
            :points="formatPoints(shape.points)"
            class="fill-violet-500/30 stroke-violet-600 stroke-[1.5] hover:fill-violet-500/50 transition-colors"
            vector-effect="non-scaling-stroke"
          />
        </g>
        <polygon
          v-if="props.fabricBoundary?.length"
          :points="formatPoints(props.fabricBoundary)"
          fill="none"
          class="stroke-emerald-600 stroke-[2] dark:stroke-emerald-400"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>

    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
      No items to display
    </div>
  </div>
</template>
