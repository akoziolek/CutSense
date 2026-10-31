<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Sliders } from 'lucide-vue-next'

const props = defineProps<{
  zoomLevel: number
}>()

const emit = defineEmits<{
  (e: 'update:zoomLevel', value: number): void
  (e: 'rotate', direction: 'cw' | 'ccw'): void
}>()

const zoomIn = () => {
  if (props.zoomLevel < 3) {
    emit('update:zoomLevel', Number((props.zoomLevel + 0.2).toFixed(2)))
  }
}

const zoomOut = () => {
  if (props.zoomLevel > 0.75) {
    emit('update:zoomLevel', Number((props.zoomLevel - 0.2).toFixed(2)))
  }
}
</script>

<template>
  <div class="p-4 bg-card border border-muted rounded-md shadow-xs space-y-3">
    <div class="flex items-center gap-2 pb-2 border-b border-border/60">
      <Sliders class="h-4 w-4 text-foreground" />
      <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
        Image Controls
      </h3>
    </div>

    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-muted-foreground font-medium">Photo Zoom:</span>
      <div class="flex items-center gap-1 bg-muted/30 py-1 px-2 rounded-lg border border-border/50">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          class="h-7 w-7 cursor-pointer"
          @click="zoomOut"
          :disabled="props.zoomLevel <= 0.75"
        >
          <ZoomOut class="h-3.5 w-3.5" />
          <span class="sr-only">Zoom out</span>
        </Button>

        <span class="text-xs font-mono px-1 min-w-12 text-center select-none font-bold">
          {{ Math.round(props.zoomLevel * 100) }}%
        </span>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          class="h-7 w-7 cursor-pointer"
          @click="zoomIn"
          :disabled="props.zoomLevel >= 3"
        >
          <ZoomIn class="h-3.5 w-3.5" />
          <span class="sr-only">Zoom in</span>
        </Button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-muted-foreground font-medium">Rotate image:</span>
      <div class="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2.5 gap-1.5 text-xs cursor-pointer bg-brand-green/70 hover:bg-brand-green text-foreground border-brand-green/30"
          title="Rotate 90° counter-clockwise"
          @click="emit('rotate', 'ccw')"
        >
          <RotateCcw class="h-3.5 w-3.5 text-brand-green-foreground" />
          <span>90°</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2.5 gap-1.5 text-xs cursor-pointer bg-brand-green/70 hover:bg-brand-green text-foreground border-brand-green/30"
          title="Rotate 90° clockwise"
          @click="emit('rotate', 'cw')"
        >
          <RotateCw class="h-3.5 w-3.5 text-brand-green-foreground" />
          <span>90°</span>
        </Button>
      </div>
    </div>
  </div>
</template>
