<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PieceImageSource } from '@/types/geometry'

const props = withDefaults(
  defineProps<{
    points: [number, number][]
    image?: PieceImageSource
    label?: string
    margin?: number
    showDimensions?: boolean
  }>(),
  { margin: 1.15, showDimensions: false },
)

// pill size used for overlap checks, in px
const LABEL_W = 46
const LABEL_H = 16

const rootRef = ref<HTMLElement | null>(null)
const widthPx = ref(200)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!rootRef.value) return
  widthPx.value = rootRef.value.clientWidth || widthPx.value
  observer = new ResizeObserver(([entry]) => {
    if (entry) widthPx.value = entry.contentRect.width || widthPx.value
  })
  observer.observe(rootRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

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
    size,
    left,
    top: -(bottom + size),
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

// Longest edges first. Each pill starts at the middle of its edge; if that spot is taken
// it is moved a bit along / across the edge. A pill is dropped only when no free spot is found.
const dimensionLabels = computed(() => {
  if (!props.showDimensions || !view.value) return []
  const { size, left, top } = view.value
  const W = widthPx.value
  const pts = props.points
  const k = W / size // px per unit

  const clampX = (v: number) => Math.min(Math.max(v, LABEL_W / 2), W - LABEL_W / 2)
  const clampY = (v: number) => Math.min(Math.max(v, LABEL_H / 2), W - LABEL_H / 2)

  const candidates = pts.map(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]!
    const len = Math.hypot(x2 - x1, y2 - y1)
    // tangent in screen space (SVG Y points down)
    const tx = len ? (x2 - x1) / len : 1
    const ty = len ? -(y2 - y1) / len : 0
    return {
      key: i,
      len,
      tx,
      ty,
      px: ((x1 + x2) / 2 - left) * k,
      py: (-(y1 + y2) / 2 - top) * k,
      text: `${(len / 10).toFixed(1)} cm`,
    }
  })
  candidates.sort((a, b) => b.len - a.len)

  const placed: { key: number; text: string; px: number; py: number }[] = []
  const isFree = (px: number, py: number) =>
    !placed.some((p) => Math.abs(p.px - px) < LABEL_W && Math.abs(p.py - py) < LABEL_H)

  for (const c of candidates) {
    const nx = -c.ty
    const ny = c.tx
    const offsets: [number, number][] = [[0, 0]]
    for (const d of [10, 20, 30]) {
      offsets.push(
        [nx * d, ny * d],
        [-nx * d, -ny * d],
        [c.tx * d, c.ty * d],
        [-c.tx * d, -c.ty * d],
      )
    }

    for (const [ox, oy] of offsets) {
      const px = clampX(c.px + ox)
      const py = clampY(c.py + oy)
      if (isFree(px, py)) {
        placed.push({ key: c.key, text: c.text, px, py })
        break
      }
    }
  }

  return placed.map((p) => ({
    key: p.key,
    text: p.text,
    left: `${(p.px / W) * 100}%`,
    top: `${(p.py / W) * 100}%`,
  }))
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <svg
      v-if="view"
      :viewBox="view.viewBox"
      preserveAspectRatio="xMidYMid meet"
      class="block h-full w-full"
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

    <div
      v-for="d in dimensionLabels"
      :key="d.key"
      class="pointer-events-none absolute select-none whitespace-nowrap rounded-full border border-border/50 bg-background/60 px-1.5 py-0.5 font-inter text-[9px] font-semibold leading-none text-foreground backdrop-blur-[2px]"
      :style="{ left: d.left, top: d.top, transform: 'translate(-50%, -50%)' }"
    >
      {{ d.text }}
    </div>
  </div>
</template>