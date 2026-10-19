<script setup lang="ts">
import { Info, Trash2 } from 'lucide-vue-next'
import GrainlineDial from './GrainlineDial.vue'
import { useNewPattern } from '@/composables/useNewPattern'

const { draft, removePiece } = useNewPattern()

const photoUrl = (photoId: number) => draft.photos.find((p) => p.id === photoId)?.url

const numberClass =
  'h-7 w-16 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border'

const clamp = (value: string, min: number, max: number) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl space-y-5">
      <article
      v-for="(piece, index) in draft.pieces"
      :key="piece.id"
      class="flex flex-col items-stretch overflow-hidden rounded-md border border-muted bg-card shadow-md sm:flex-row"
    >
      <div class="h-48 w-full shrink-0 self-stretch bg-white sm:h-auto sm:w-36">
        <img
          v-if="photoUrl(piece.photoId)"
          :src="photoUrl(piece.photoId)"
          alt=""
          class="h-full w-full object-contain"
        />
      </div>

      <div class="min-w-0 flex-1 p-3">
        <div class="flex items-center gap-3">
          <h3 class="flex-1 border-b border-muted pb-1 font-inter text-lg font-bold">
            Piece #{{ index + 1 }}
          </h3>
          <button
            type="button"
            class="rounded-md border border-destructive/50 p-1.5 text-destructive hover:bg-destructive/10"
            :aria-label="`Delete piece ${index + 1}`"
            @click="removePiece(piece.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="mt-3 flex flex-wrap gap-y-4">
          <div class="space-y-2 pr-5">
            <h4 class="font-inter text-sm font-semibold leading-5">Number of pieces</h4>
            <label class="flex items-center gap-3 text-xs">
              <span class="w-14">Normal</span>
              <input
                type="number"
                min="0"
                max="99"
                :value="piece.normal"
                :class="numberClass"
                @change="piece.normal = clamp(($event.target as HTMLInputElement).value, 0, 99)"
              />
            </label>
            <label class="flex items-center gap-3 text-xs">
              <span class="w-14">Mirrored</span>
              <input
                type="number"
                min="0"
                max="99"
                :value="piece.mirrored"
                :class="numberClass"
                @change="piece.mirrored = clamp(($event.target as HTMLInputElement).value, 0, 99)"
              />
            </label>
          </div>

          <div class="space-y-2 sm:border-l sm:border-muted sm:pl-5">
            <h4 class="flex items-center gap-1.5 font-inter text-sm font-semibold leading-5">
              Grainline
              <span class="group relative">
                <Info class="h-3.5 w-3.5 text-muted-foreground" tabindex="0" />
                <span
                  role="tooltip"
                  class="invisible absolute left-5 top-0 z-10 w-64 rounded-md border border-border bg-popover p-2 text-[11px] font-normal text-foreground shadow-md group-focus-within:visible group-hover:visible"
                >
                  Defines the direction in which the pattern should be placed on the fabric. Pattern
                  pieces will be automatically aligned based on this angle during layout and nesting.
                </span>
              </span>
            </h4>
            <div class="flex flex-wrap items-start gap-1">
              <div class="flex h-7 items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="359"
                  :value="piece.grainline"
                  :class="numberClass"
                  aria-label="Grainline angle in degrees"
                  @change="piece.grainline = clamp(($event.target as HTMLInputElement).value, 0, 359)"
                />
                <span class="text-xs">°</span>
              </div>
              <GrainlineDial v-model="piece.grainline" class="-mt-4" />
            </div>
          </div>
        </div>
      </div>
    </article>

    <p
      v-if="!draft.pieces.length"
      class="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
    >
      No pieces left. Go back and add photos to detect pieces again.
    </p>
  </div>
</template>