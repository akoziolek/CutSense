<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-vue-next'

defineProps<{
  src: string
  alt: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

const zoomLevel = ref(1)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })

const clampPosition = (x: number, y: number, currentZoom: number) => {
  if (!containerRef.value || !imgRef.value) return { x: 0, y: 0 }

  const container = containerRef.value.getBoundingClientRect()
  const imgWidth = imgRef.value.offsetWidth
  const imgHeight = imgRef.value.offsetHeight

  const maxX = Math.max(0, (imgWidth * currentZoom - container.width) / 2)
  const maxY = Math.max(0, (imgHeight * currentZoom - container.height) / 2)

  return {
    x: Math.min(Math.max(x, -maxX), maxX),
    y: Math.min(Math.max(y, -maxY), maxY),
  }
}

const setZoom = (newZoom: number) => {
  const targetZoom = Math.min(Math.max(newZoom, 0.75), 4)
  zoomLevel.value = targetZoom

  if (targetZoom <= 1) {
    position.value = { x: 0, y: 0 }
  } else {
    position.value = clampPosition(position.value.x, position.value.y, targetZoom)
  }
}

const zoomIn = () => setZoom(zoomLevel.value + 0.25)
const zoomOut = () => setZoom(zoomLevel.value - 0.25)

const resetZoom = () => {
  zoomLevel.value = 1
  position.value = { x: 0, y: 0 }
}

const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

const startDrag = (e: MouseEvent) => {
  if (zoomLevel.value <= 1) return
  isDragging.value = true
  startPos.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  }
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  e.preventDefault()

  const rawX = e.clientX - startPos.value.x
  const rawY = e.clientY - startPos.value.y

  position.value = clampPosition(rawX, rawY, zoomLevel.value)
}

const stopDrag = () => {
  isDragging.value = false
}
</script>

<template>
  <Dialog @update:open="resetZoom">
    <DialogTrigger as-child>
      <div
        class="relative group cursor-zoom-in overflow-hidden rounded-md bg-card shadow-lg w-full h-full"
      >
        <img
          :src="src"
          :alt="alt"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div
          class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <span class="rounded-full bg-background/80 p-2 shadow-sm backdrop-blur-sm">
            <ZoomIn class="h-5 w-5 text-foreground" />
          </span>
        </div>
      </div>
    </DialogTrigger>

    <DialogContent
      class="max-w-[95vw] w-full h-[90vh] p-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md border overflow-hidden [&>button]:hidden"
      @open-auto-focus="(e) => e.preventDefault()"
    >
      <div
        class="absolute top-4 left-4 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1.5 rounded-md border shadow-sm"
      >
        <Button size="icon" variant="ghost" @click="zoomOut" :disabled="zoomLevel <= 0.75">
          <ZoomOut class="h-4 w-4" />
        </Button>
        <span class="text-xs font-inter px-1 min-w-12 text-center select-none">
          {{ Math.round(zoomLevel * 100) }}%
        </span>
        <Button size="icon" variant="ghost" @click="zoomIn" :disabled="zoomLevel >= 4">
          <ZoomIn class="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" @click="resetZoom">
          <RotateCcw class="h-4 w-4" />
        </Button>
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

      <div
        ref="containerRef"
        class="w-full h-full flex items-center justify-center overflow-hidden select-none"
        :class="{
          'cursor-grab': zoomLevel > 1 && !isDragging,
          'cursor-grabbing': isDragging,
          'cursor-default': zoomLevel <= 1,
        }"
        @wheel="handleWheel"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <img
          ref="imgRef"
          :src="src"
          :alt="alt"
          draggable="false"
          class="max-h-full max-w-full object-contain transition-transform duration-75 ease-out"
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
          }"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
