<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EmblaCarouselType } from 'embla-carousel'
import type { EmblaCarouselType } from 'embla-carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import ImagePreview from '@/components/common/ImagePreview.vue'
import type { Point2D, PolygonEdge } from '@/types/geometry'

export interface PatternPiece {
  id: number
  patternImageId: number
  grainline: number
  points: [number, number][]
}

export interface PatternImage {
  id: number
  url: string
  imageWidthMm: number
  imageHeightMm: number
  orderIndex: number
}

const props = defineProps<{
  images: PatternImage[]
  pieces: PatternPiece[]
}>()

const activeShapeMap = ref<Record<number, number | null>>({})
const emblaApi = ref<EmblaCarouselType | null>(null)
const current = ref(0)

const slides = computed(() =>
  props.images.map((img, index) => {
    const imgPieces = props.pieces.filter((p) => p.patternImageId === img.id)
    const w = img.imageWidthMm || 1
    const h = img.imageHeightMm || 1

    const shapes: Point2D[][] = imgPieces.map((piece) =>
      piece.points.map(([xMm, yMm]) => ({
        pctX: Number(((xMm / w) * 100).toFixed(2)),
        pctY: Number((((h - yMm) / h) * 100).toFixed(2)),
      })),
    )

    const allShapesEdges: PolygonEdge[][] = shapes.map((pts) => {
      if (pts.length < 2) return []

      return pts.map((p1, idx) => {
        const p2 = pts[(idx + 1) % pts.length]!
        const dx = ((p2.pctX - p1.pctX) / 100) * w
        const dy = ((p2.pctY - p1.pctY) / 100) * h
        const distanceCm = (Math.hypot(dx, dy) / 10).toFixed(1)

        return {
          index: idx,
          p1,
          p2,
          distanceCm,
        }
      })
    })

    return {
      id: img.id,
      url: img.url,
      alt: `Pattern sheet ${index + 1}`,
      shapes,
      allShapesEdges,
    }
  }),
)

const emblaApi = ref<EmblaCarouselType | null>(null)
const current = ref(0)

const onInit = (api: EmblaCarouselType | undefined) => {
  if (!api) return
  emblaApi.value = api
  current.value = api.selectedScrollSnap()
  api.on('select', () => {
    current.value = api.selectedScrollSnap()
  })
}

const handleSelectShape = (imageId: number, shapeIdx: number) => {
  if (activeShapeMap.value[imageId] === shapeIdx) {
    activeShapeMap.value[imageId] = null
  } else {
    activeShapeMap.value[imageId] = shapeIdx
  }
}

const handleClearSelection = (imageId: number) => {
  activeShapeMap.value[imageId] = null
}
</script>

<template>
  <Carousel
    v-if="slides.length"
    :opts="{ align: 'start', loop: false, watchDrag: false }"
    class="relative w-full max-w-[500px] mx-auto select-none"
    @init-api="onInit"
  >
    <CarouselContent class="ml-0">
      <CarouselItem v-for="slide in slides" :key="slide.id" class="pl-0 basis-full">
        <div class="aspect-square w-full max-h-[500px]">
          <ImagePreview
            :src="slide.url"
            :alt="slide.alt"
            :shapes="slide.shapes"
            :all-shapes-edges="slide.allShapesEdges"
            :active-shape-index="activeShapeMap[slide.id]"
            @activate-shape="handleSelectShape(slide.id, $event)"
            @click-background="handleClearSelection(slide.id)"
          />
        </div>
      </CarouselItem>
    </CarouselContent>

    <template v-if="slides.length > 1">
      <CarouselPrevious
        class="absolute left-2 top-1/2 -translate-y-1/2 h-14 w-6 rounded-sm bg-zinc-700 text-white hover:bg-zinc-600 hover:text-white border-none shadow-none z-40"
      />
      <CarouselNext
        class="absolute right-2 top-1/2 -translate-y-1/2 h-14 w-6 rounded-sm bg-zinc-700 text-white hover:bg-zinc-600 hover:text-white border-none shadow-none z-40"
      />

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          type="button"
          class="h-1 w-6 rounded-full transition-colors cursor-pointer"
          :class="index === current ? 'bg-zinc-800' : 'bg-zinc-400'"
          :aria-label="`Go to sheet ${index + 1}`"
          @click="emblaApi?.scrollTo(index)"
        />
      </div>
    </template>
  </Carousel>

  <div
    v-else
    class="flex aspect-square w-full max-h-[500px] items-center justify-center rounded-md border bg-muted text-muted-foreground"
  >
    No pattern sheets to display
  </div>
</template>
