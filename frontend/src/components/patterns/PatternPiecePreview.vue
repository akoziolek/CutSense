<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ZoomIn } from 'lucide-vue-next'
import ImagePreview from '@/components/common/ImagePreview.vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'
import { getCartesianDistance, toImagePixels } from '@/utils/geometry'

const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    points: Point2D[]
    shapeIndex?: number
    rotation?: number
    allShapes?: Point2D[][]
    allShapesEdges?: PolygonEdge[][]
    // Real size of the WHOLE photo. Points stay in % of the photo, but with these two the
    // preview keeps the photo's aspect ratio and can show real lengths.
    // Without them the old behaviour is kept (photo treated as a 100 x 100 square).
    imageWidthMm?: number
    imageHeightMm?: number
    // how much of the photo around the piece is visible (1 = tight crop)
    margin?: number
    // darken everything outside the piece
    dimOutside?: boolean
    // edge length pills (needs imageWidthMm / imageHeightMm, skipped when rotated)
    showDimensions?: boolean
    // px at the top kept free of dimension pills (e.g. for overlay badges)
    reserveTop?: number
    // fill the parent instead of the fixed 128/144 px thumbnail
    fill?: boolean
  }>(),
  { margin: 1.05, dimOutside: false, showDimensions: false, reserveTop: 0, fill: false },
)

// pill size used for overlap checks, in px
const LABEL_W = 46
const LABEL_H = 16

const hasRealSize = computed(
  () =>
    !!props.imageWidthMm && props.imageWidthMm > 0 && !!props.imageHeightMm && props.imageHeightMm > 0,
)
// photo size in "units": mm when known, otherwise % (100 x 100)
const W = computed(() => (hasRealSize.value ? props.imageWidthMm! : 100))
const H = computed(() => (hasRealSize.value ? props.imageHeightMm! : 100))

// points in photo units, Y down (same as SVG)
const pts = computed<[number, number][]>(() =>
  props.points.map((point) => {
    const pixel = toImagePixels(point, W.value, H.value)
    return [pixel.x, pixel.y]
  }),
)

const fit = (start: number, size: number, limit: number) =>
  size >= limit ? (limit - size) / 2 : Math.min(Math.max(start, 0), limit - size)

const view = computed(() => {
  const p = pts.value
  if (p.length === 0) {
    const size = Math.min(W.value, H.value)
    return { size, left: 0, top: 0, polygon: '', ringPath: '' }
  }

  const xs = p.map(([x]) => x)
  const ys = p.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const pieceSize = Math.max(maxX - minX, maxY - minY, 0.1)

  // square crop around the piece, never bigger than the photo
  const size = Math.max(pieceSize, Math.min(pieceSize * props.margin, W.value, H.value))
  const ring = p.map(([x, y]) => `${x},${y}`)

  return {
    size,
    left: fit(cx - size / 2, size, W.value),
    top: fit(cy - size / 2, size, H.value),
    polygon: ring.join(' '),
    ringPath: `M${ring.join(' L')} Z`,
  }
})

const viewBoxStr = computed(() => `${view.value.left} ${view.value.top} ${view.value.size} ${view.value.size}`)
const outsidePath = computed(
  () => `M0,0 H${W.value} V${H.value} H0 Z ${view.value.ringPath}`,
)

// ---------- dimension pills ----------
const rootRef = ref<HTMLElement | null>(null)
const widthPx = ref(144)
let observer: ResizeObserver | null = null

watch(
  rootRef,
  (el) => {
    observer?.disconnect()
    observer = null
    if (!el) return
    widthPx.value = el.clientWidth || widthPx.value
    observer = new ResizeObserver(([entry]) => {
      if (entry) widthPx.value = entry.contentRect.width || widthPx.value
    })
    observer.observe(el)
  },
  { immediate: true, flush: 'post' },
)
onBeforeUnmount(() => observer?.disconnect())

// Longest edges first. Each pill starts in the middle of its edge; if that spot is taken
// (or under the reserved top band) it is nudged along / across the edge.
// A pill is dropped only when there is no free spot nearby.
const dimensionLabels = computed(() => {
  // pills are HTML on top of the svg, so they would not follow a rotated photo
  if (!props.showDimensions || !hasRealSize.value || props.rotation) return []

  const { size, left, top } = view.value
  const p = pts.value
  const Wp = widthPx.value
  const k = Wp / size // px per unit

  const clampX = (v: number) => Math.min(Math.max(v, LABEL_W / 2), Wp - LABEL_W / 2)
  const clampY = (v: number) =>
    Math.min(Math.max(v, props.reserveTop + LABEL_H / 2), Wp - LABEL_H / 2)

  const candidates = p.map(([x1, y1], i) => {
    const [x2, y2] = p[(i + 1) % p.length]!
    const len = getCartesianDistance({ x: x1, y: y1 }, { x: x2, y: y2 })
    return {
      key: i,
      len,
      tx: len ? (x2 - x1) / len : 1,
      ty: len ? (y2 - y1) / len : 0,
      px: ((x1 + x2) / 2 - left) * k,
      py: ((y1 + y2) / 2 - top) * k,
      text: `${(len / 10).toFixed(1)} cm`,
    }
  })
  candidates.sort((a, b) => b.len - a.len)

  const placed: { key: number; text: string; px: number; py: number }[] = []
  const isFree = (px: number, py: number) =>
    !placed.some((q) => Math.abs(q.px - px) < LABEL_W && Math.abs(q.py - py) < LABEL_H)

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

  return placed.map((q) => ({
    key: q.key,
    text: q.text,
    left: `${(q.px / Wp) * 100}%`,
    top: `${(q.py / Wp) * 100}%`,
  }))
})
</script>

<template>
  <ImagePreview
    v-if="imageUrl"
    :src="imageUrl"
    :alt="$t('patterns.piecePreview')"
    :shapes="allShapes || [points]"
    :active-shape-index="shapeIndex"
    :all-shapes-edges="allShapesEdges"
  >
    <template #trigger>
      <div
        ref="rootRef"
        class="relative group cursor-zoom-in shrink-0 overflow-hidden aspect-square bg-muted/20"
        :class="
          fill
            ? 'w-full'
            : 'w-32 h-32 sm:w-36 sm:h-36 rounded-xl border border-border/40'
        "
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
          <image
            :href="imageUrl"
            x="0"
            y="0"
            :width="W"
            :height="H"
            preserveAspectRatio="none"
          />
          <path v-if="dimOutside" :d="outsidePath" fill-rule="evenodd" class="fill-black/40" />
          <polygon
            :points="view.polygon"
            class="fill-violet-500/20 stroke-violet-600 stroke-1"
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
