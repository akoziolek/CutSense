<script setup lang="ts">
import { computed } from 'vue'
import type { PieceImageSource } from '@/types/geometry'

const props = withDefaults(
  defineProps<{
    points: [number, number][]
    image?: PieceImageSource
    label?: string
    margin?: number
  }>(),
  { margin: 1.15 },
)

const hasImage = computed(
  () => !!props.image?.url && props.image.imageWidthMm > 0 && props.image.imageHeightMm > 0,
)

const fit = (start: number, size: number, limit: number) =>
  size >= limit ? (limit - size) / 2 : Math.min(Math.max(start, 0), limit - size)

const view = computed(() => {
  const pts = props.points
  if (pts.length === 0) return null

  const xs = pts.map(([x]) => x)
  const ys = pts.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const pieceSize = Math.max(maxX - minX, maxY - minY, 1)

  let size = pieceSize * props.margin
  let left = cx - size / 2
  let bottom = cy - size / 2

  if (hasImage.value) {
    const { imageWidthMm: w, imageHeightMm: h } = props.image!
    size = Math.max(pieceSize, Math.min(size, w, h))
    left = fit(cx - size / 2, size, w)
    bottom = fit(cy - size / 2, size, h)
  }

  const ring = pts.map(([x, y]) => `${x},${-y}`)
  return {
    viewBox: `${left} ${-(bottom + size)} ${size} ${size}`,
    polygon: ring.join(' '),
    ringPath: `M${ring.join(' L')} Z`,
  }
})

const outsidePath = computed(() => {
  if (!view.value || !hasImage.value) return ''
  const { imageWidthMm: w, imageHeightMm: h } = props.image!
  return `M0,${-h} H${w} V0 H0 Z ${view.value.ringPath}`
})
</script>

<template>
  <svg
    v-if="view"
    :viewBox="view.viewBox"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="label ? `${label} shape` : 'Pattern piece'"
  >
    <template v-if="hasImage && image">
      <image
        :href="image.url"
        x="0"
        :y="-image.imageHeightMm"
        :width="image.imageWidthMm"
        :height="image.imageHeightMm"
        preserveAspectRatio="none"
      />
      <path :d="outsidePath" fill-rule="evenodd" class="fill-black/40" />
    </template>

    <polygon
      :points="view.polygon"
      :class="hasImage ? 'fill-violet-500/10 stroke-violet-600' : 'fill-brand-violet/40 stroke-foreground'"
      stroke-width="2"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>