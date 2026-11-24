<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import PatternPiecePreview from '@/components/patterns/PatternPiecePreview.vue'
import type { Point2D, PointMm } from '@/types/geometry'

const props = defineProps<{
  label: string
  points: PointMm[]
  preview?: {
    imageUrl: string
    points: Point2D[]
    shapeIndex: number
    allShapes: Point2D[][]
  }
  normalCount: number
  mirroredCount: number
  fabricLabel?: string
  selected: boolean
}>()

const emit = defineEmits<{ (e: 'toggle'): void }>()

const shape = computed(() => {
  const pts = props.points
  if (!pts.length) return { viewBox: '0 0 1 1', polygon: '' }

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX || 1
  const h = maxY - minY || 1
  const pad = Math.max(w, h) * 0.08

  return {
    viewBox: `${minX - pad} ${-maxY - pad} ${w + pad * 2} ${h + pad * 2}`,
    polygon: pts.map((p) => `${p.x},${-p.y}`).join(' '),
  }
})
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group block w-full cursor-pointer rounded-xl text-left focus-visible:outline-none"
    :aria-pressed="selected"
    @click="emit('toggle')"
    @keydown.enter.prevent="emit('toggle')"
    @keydown.space.prevent="emit('toggle')"
  >
    <Card
      class="relative gap-2 p-3 transition-all group-focus-visible:ring-2 group-focus-visible:ring-ring"
      :class="
        selected
          ? 'ml-1 border-2 !border-primary shadow-lg'
          : 'border-muted shadow-xs hover:shadow-md'
      "
    >
      <Checkbox
        :model-value="selected"
        class="pointer-events-none absolute right-2 top-2 z-10 bg-background"
        tabindex="-1"
      />

      <div class="aspect-square overflow-hidden rounded-md bg-muted/20">
        <PatternPiecePreview
          v-if="preview"
          fill
          :image-url="preview.imageUrl"
          :points="preview.points"
          :shape-index="preview.shapeIndex"
          :all-shapes="preview.allShapes"
        />
        <svg v-else :viewBox="shape.viewBox" class="h-full w-full p-3" role="img" :aria-label="label">
          <polygon
            :points="shape.polygon"
            class="fill-brand-violet/40 stroke-foreground"
            stroke-width="2"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div class="space-y-1">
        <p class="truncate text-xs font-bold font-inter">{{ label }}</p>
        <p class="text-xs text-muted-foreground">
          {{ normalCount }} normal · {{ mirroredCount }} mirrored
        </p>
        <Badge
          v-if="fabricLabel"
          variant="secondary"
          class="max-w-full truncate rounded-md bg-brand-green font-normal text-brand-green-foreground"
        >
          {{ fabricLabel }}
        </Badge>
        <Badge v-else variant="outline" class="rounded-md font-normal text-warning-foreground">
          No fabric
        </Badge>
      </div>
    </Card>
  </div>
</template>