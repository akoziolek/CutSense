<script setup lang="ts">
import { computed } from 'vue'

export interface PlacementItem {
  patternPieceId?: number
  x: number
  y: number
  rotationAngle?: number
  polygon?: [number, number][]
}

const props = defineProps<{
  placements: PlacementItem[]
}>()

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

// 2. Compute dynamic bounding box across all pieces
const bbox = computed(() => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  processedShapes.value.forEach((shape) => {
    shape.points.forEach(([x, y]) => {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    })
  })

  if (!isFinite(minX)) {
    return { x: 0, y: 0, w: 1000, h: 1000, cx: 500, cy: 500 }
  }

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

const viewBoxStr = computed(
  () => `${bbox.value.x} ${bbox.value.y} ${bbox.value.w} ${bbox.value.h}`,
)

const formatPoints = (points: [number, number][]) =>
  points.map(([x, y]) => `${x},${y}`).join(' ')
</script>

<template>
  <div
    class="w-full aspect-square relative rounded-xl border border-border bg-background overflow-hidden p-2"
  >
    <svg
      v-if="props.placements.length > 0"
      :viewBox="viewBoxStr"
      preserveAspectRatio="xMidYMid meet"
      class="w-full h-full block"
    >
      <!-- Scale (1, -1) flips Y vertically around the center of the bounding box -->
      <g
        :transform="`scale(1, -1)`"
        :transform-origin="`${bbox.cx} ${bbox.cy}`"
      >
        <polygon
          v-for="(shape, idx) in processedShapes"
          :key="idx"
          :points="formatPoints(shape.points)"
          class="fill-violet-500/30 stroke-violet-600 stroke-[1.5] hover:fill-violet-500/50 transition-colors"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>

    <div
      v-else
      class="flex h-full items-center justify-center text-sm text-muted-foreground"
    >
      No items to display
    </div>
  </div>
</template>