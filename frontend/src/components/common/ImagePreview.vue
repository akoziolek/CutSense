<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, X, Eye, EyeOff } from 'lucide-vue-next'
import SpatialCanvas from '../spatial/SpatialCanvas.vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'

const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    points?: Point2D[]
    edges?: PolygonEdge[]
  }>(),
  {
    points: () => [],
    edges: () => [],
  },
)

const zoomLevel = ref(1)
const canvasOffset = ref({ x: 0, y: 0 })
const showOverlay = ref(true)

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3.5)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5)
}

const resetZoom = () => {
  zoomLevel.value = 1
  canvasOffset.value = { x: 0, y: 0 }
}
</script>

<template>
  <Dialog @update:open="resetZoom">
    <DialogTrigger as-child>
      <div
        class="relative group cursor-zoom-in overflow-hidden rounded-md bg-card border border-muted/50 shadow-sm w-full h-full min-h-[300px]"
      >
        <img
          :src="src"
          :alt="alt"
          class="w-full h-full object-cover block select-none transition-transform duration-300 group-hover:scale-105"
        />
        <div
          class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30"
        >
          <span class="rounded-full bg-background/80 p-2 shadow-sm backdrop-blur-sm">
            <ZoomIn class="h-5 w-5 text-foreground" />
          </span>
        </div>
      </div>
    </DialogTrigger>

    <DialogContent
      class="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col items-center justify-center bg-background border overflow-hidden [&>button]:hidden"
      @open-auto-focus="(e) => e.preventDefault()"
    >
      <div
        class="absolute top-4 left-4 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1.5 rounded-md border shadow-sm"
      >
        <Button size="icon" variant="ghost" @click="zoomOut" :disabled="zoomLevel <= 0.5">
          <ZoomOut class="h-4 w-4" />
        </Button>
        <span class="text-xs font-inter px-1 min-w-12 text-center select-none">
          {{ Math.round(zoomLevel * 100) }}%
        </span>
        <Button size="icon" variant="ghost" @click="zoomIn" :disabled="zoomLevel >= 3.5">
          <ZoomIn class="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" @click="resetZoom">
          <RotateCcw class="h-4 w-4" />
        </Button>

        <template v-if="props.points.length > 0">
          <div class="h-4 w-px bg-border mx-1" />
          <Button
            size="icon"
            variant="ghost"
            class="h-9 w-9 transition-colors cursor-pointer"
            :class="{ 'bg-brand-green text-foreground': showOverlay }"
            :title="showOverlay ? 'Hide shape' : 'Show shape'"
            @click="showOverlay = !showOverlay"
          >
            <Eye v-if="showOverlay" class="h-3.5 w-3.5" />
            <EyeOff v-else class="h-3.5 w-3.5" />
          </Button>
        </template>
      </div>

      <div
        class="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm p-1.5 rounded-md border shadow-sm"
      >
        <DialogClose as-child>
          <Button size="icon" variant="ghost">
            <X class="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>

      <div class="w-full h-full relative">
        <SpatialCanvas
          :image-url="src"
          :points="showOverlay ? props.points : []"
          :edges="showOverlay ? props.edges : []"
          :show-labels="showOverlay"
          :zoom-level="zoomLevel"
          :canvas-offset="canvasOffset"
          :read-only="true"
          @update:zoom-level="zoomLevel = $event"
          @update:canvas-offset="canvasOffset = $event"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>