<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

export interface PatternPiece {
  id: number
  points: [number, number][]
}

interface EmblaLike {
  selectedScrollSnap(): number
  scrollTo(index: number): void
  on(event: string, callback: () => void): void
}

const props = defineProps<{ pieces: PatternPiece[] }>()

const slides = computed(() =>
  props.pieces
    .filter((piece) => piece.points.length > 2)
    .map((piece) => {
      const xs = piece.points.map(([x]) => x)
      const ys = piece.points.map(([, y]) => y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const width = maxX - minX || 1
      const height = maxY - minY || 1
      const pad = Math.max(width, height) * 0.08
      return {
        id: piece.id,
        viewBox: `${minX - pad} ${minY - pad} ${width + 2 * pad} ${height + 2 * pad}`,
        // DB uses a Cartesian system, SVG has the Y axis pointing down
        polygon: piece.points.map(([x, y]) => `${x},${minY + maxY - y}`).join(' '),
      }
    }),
)

const emblaApi = ref<EmblaLike | null>(null)
const current = ref(0)

const onInit = (api: EmblaLike) => {
  emblaApi.value = api
  current.value = api.selectedScrollSnap()
  api.on('select', () => {
    current.value = api.selectedScrollSnap()
  })
}
</script>

<template>
  <Carousel
    v-if="slides.length"
    :opts="{ align: 'start', loop: false }"
    class="relative w-full max-w-[500px] mx-auto"
    @init-api="onInit"
  >
    <CarouselContent class="ml-0">
      <CarouselItem v-for="(slide, index) in slides" :key="slide.id" class="pl-0 basis-full">
        <div class="aspect-square w-full rounded-md border border-muted bg-card p-8 shadow-sm">
          <svg
            :viewBox="slide.viewBox"
            class="h-full w-full"
            role="img"
            :aria-label="`Pattern piece ${index + 1} of ${slides.length}`"
          >
            <polygon
              :points="slide.polygon"
              class="fill-brand-violet/40 stroke-foreground"
              stroke-width="2"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>
      </CarouselItem>
    </CarouselContent>

    <template v-if="slides.length > 1">
      <CarouselPrevious
        class="absolute left-2 top-1/2 -translate-y-1/2 h-14 w-6 rounded-sm bg-zinc-700 text-white hover:bg-zinc-600 hover:text-white border-none shadow-none"
      />
      <CarouselNext
        class="absolute right-2 top-1/2 -translate-y-1/2 h-14 w-6 rounded-sm bg-zinc-700 text-white hover:bg-zinc-600 hover:text-white border-none shadow-none"
      />

      <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          type="button"
          class="h-1 w-6 rounded-full transition-colors"
          :class="index === current ? 'bg-zinc-800' : 'bg-zinc-400'"
          :aria-label="`Go to piece ${index + 1}`"
          :aria-current="index === current"
          @click="emblaApi?.scrollTo(index)"
        />
      </div>
    </template>
  </Carousel>

  <div
    v-else
    class="flex aspect-square w-full max-h-[500px] items-center justify-center rounded-md border bg-muted text-muted-foreground"
  >
    No pattern pieces to display
  </div>
</template>
