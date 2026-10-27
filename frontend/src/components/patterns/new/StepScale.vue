<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useNewPattern } from '@/composables/patterns/useNewPattern'

const GRID_W = 125 // cm
const GRID_H = 100 // cm
const MIN = 10
const MAX = 250
const STEP = 5

const { draft } = useNewPattern()
const index = ref(0)
const photo = computed(() => draft.photos[index.value])

const setWidth = (value: number) => {
  photo.value.widthCm = Math.min(MAX, Math.max(MIN, Math.round(value)))
}

const heightCm = computed(() => photo.value.widthCm * photo.value.ratio)
const imageStyle = computed(() => ({
  width: `${(photo.value.widthCm / GRID_W) * 100}%`,
  height: `${(heightCm.value / GRID_H) * 100}%`,
}))

const gridStyle = {
  backgroundImage:
    'linear-gradient(to right, rgba(0,0,0,.14) 1px, transparent 1px), linear-gradient(to top, rgba(0,0,0,.14) 1px, transparent 1px)',
  backgroundSize: '20% 100%, 100% 25%',
  backgroundPosition: 'left bottom, left bottom',
}
</script>

<template>
  <div v-if="photo" class="space-y-4">
    <div class="flex items-center justify-center gap-2 sm:gap-6">
      <Button
        v-if="draft.photos.length > 1"
        variant="secondary"
        size="icon"
        class="h-8 w-8 shrink-0 rounded-full bg-secondary sm:h-10 sm:w-10"
        :disabled="index === 0"
        aria-label="Previous photo"
        @click="index--"
      >
        <ChevronLeft class="h-5 w-5" />
      </Button>

      <div class="flex min-w-0 flex-col items-center gap-4 md:flex-row md:items-stretch md:gap-6">
        <div class="flex w-full flex-row items-center gap-2 md:w-auto md:flex-col">
          <span class="rounded-md border border-muted bg-card px-3 py-1 text-xs">[CM]</span>
          <Button
            variant="outline"
            class="h-8 gap-1.5 text-xs"
            @click="setWidth(photo.widthCm + STEP)"
          >
            <ZoomIn class="h-3.5 w-3.5" /> Scale up
          </Button>
          <input
            type="range"
            :min="MIN"
            :max="MAX"
            :value="photo.widthCm"
            class="min-w-0 flex-1 accent-foreground md:min-h-32 md:flex-none md:[direction:rtl] md:[writing-mode:vertical-lr]"
            aria-label="Photo width in centimeters"
            @input="setWidth(Number(($event.target as HTMLInputElement).value))"
          />
          <Button
            variant="outline"
            class="h-8 gap-1.5 text-xs"
            @click="setWidth(photo.widthCm - STEP)"
          >
            <ZoomOut class="h-3.5 w-3.5" /> Scale down
          </Button>
        </div>

        <div class="w-full min-w-0 max-w-[520px]">
          <div class="flex gap-2">
            <div
              class="flex flex-col-reverse justify-between text-xs tabular-nums text-muted-foreground"
            >
              <span v-for="n in [0, 25, 50, 75, 100]" :key="n">{{ n }}</span>
            </div>
            <div
              class="relative w-full overflow-hidden border border-border bg-card"
              style="aspect-ratio: 125 / 100"
              :style="gridStyle"
            >
              <img
                :src="photo.url"
                alt="Pattern photo"
                class="absolute bottom-0 left-0 max-w-none select-none opacity-80 mix-blend-multiply"
                :style="imageStyle"
                draggable="false"
              />
              <div
                class="absolute bottom-2 right-2 rounded-md border border-muted bg-background/90 px-2 py-1 text-[10px] shadow-sm sm:text-xs"
              >
                <p>W: {{ photo.widthCm.toFixed(2) }} cm</p>
                <p>H: {{ heightCm.toFixed(2) }} cm</p>
              </div>
            </div>
          </div>
          <div class="ml-6 mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
            <span v-for="n in [0, 25, 50, 75, 100, 125]" :key="n">{{ n }}</span>
          </div>
        </div>
      </div>

      <Button
        v-if="draft.photos.length > 1"
        variant="secondary"
        size="icon"
        class="h-8 w-8 shrink-0 rounded-full bg-secondary sm:h-10 sm:w-10"
        :disabled="index === draft.photos.length - 1"
        aria-label="Next photo"
        @click="index++"
      >
        <ChevronRight class="h-5 w-5" />
      </Button>
    </div>

    <ul
      v-if="draft.photos.length > 1"
      class="flex flex-wrap justify-center gap-2 border-t border-muted pt-3"
    >
      <li v-for="(p, i) in draft.photos" :key="p.id">
        <button
          type="button"
          class="h-12 w-12 overflow-hidden rounded-md border-2 bg-card"
          :class="i === index ? 'border-foreground' : 'border-muted opacity-70'"
          :aria-label="`Photo ${i + 1}`"
          @click="index = i"
        >
          <img :src="p.url" alt="" class="h-full w-full object-cover" />
        </button>
      </li>
    </ul>
  </div>
</template>
