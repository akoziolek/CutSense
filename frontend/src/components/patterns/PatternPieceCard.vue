<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, Copy, FlipHorizontal2, Compass } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PatternPiece } from '@/components/patterns/PatternPiecesCarousel.vue'

const props = defineProps<{
  piece: PatternPiece
  label: string
}>()

const shape = computed(() => {
  const pts = props.piece.points
  if (pts.length === 0) return { viewBox: '0 0 1 1', polygon: '' }

  const xs = pts.map(([x]) => x)
  const ys = pts.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const pad = Math.max(width, height) * 0.08

  return {
    viewBox: `${minX - pad} ${-maxY - pad} ${width + pad * 2} ${height + pad * 2}`,
    polygon: pts.map(([x, y]) => `${x},${-y}`).join(' '),
  }
})
</script>

<template>
  <Card class="gap-3 border-muted px-4 py-4 shadow-xs transition-shadow hover:shadow-md">
    <div class="aspect-square rounded-md border border-border/40 bg-muted/20 p-4">
      <svg
        :viewBox="shape.viewBox"
        class="h-full w-full"
        role="img"
        :aria-label="`${label} shape`"
      >
        <polygon
          :points="shape.polygon"
          class="fill-brand-violet/40 stroke-foreground"
          stroke-width="2"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>

    <h3 class="truncate text-sm font-bold font-inter text-foreground">{{ label }}</h3>

    <div class="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" class="gap-1 rounded-md bg-brand-grey font-normal text-foreground">
        <Copy class="size-3" />
        Normal: <span class="font-mono font-semibold">{{ piece.normalCount }}</span>
      </Badge>
      <Badge variant="secondary" class="gap-1 rounded-md bg-brand-grey font-normal text-foreground">
        <FlipHorizontal2 class="size-3" />
        Mirrored: <span class="font-mono font-semibold">{{ piece.mirroredCount }}</span>
      </Badge>
    </div>

    <div
      class="flex items-center gap-2 text-xs text-muted-foreground"
      title="Pieces are stored with the grainline already aligned vertically"
    >
      <div
        class="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30"
      >
        <ArrowUp class="size-3.5 text-violet-600" />
      </div>
      <Compass class="size-3.5" />
      <span>Grainline: vertical (0°)</span>
    </div>
  </Card>
</template>