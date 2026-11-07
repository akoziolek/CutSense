<script setup lang="ts">
import { ArrowUp, Copy, FlipHorizontal2 } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PatternPieceImage from '@/components/patterns/PatternPieceImage.vue'
import type { PatternPiece } from '@/components/patterns/PatternPiecesCarousel.vue'
import type { PieceImageSource } from '@/types/geometry'

defineProps<{
  piece: PatternPiece
  label: string
  image?: PieceImageSource
}>()
</script>

<template>
  <Card
    class="gap-0 overflow-hidden border border-muted-foreground/20 p-0 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="relative aspect-square w-full bg-muted/20">
      <PatternPieceImage
        :points="piece.points"
        :image="image"
        :label="label"
        class="h-full w-full"
      />

      <div class="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <Badge
          variant="secondary"
          class="max-w-[65%] rounded-full bg-background/90 px-2.5 py-0.5 font-inter text-xs font-bold text-foreground shadow-xs backdrop-blur-sm"
        >
          <span class="truncate">{{ label }}</span>
        </Badge>

        <Badge
          variant="secondary"
          class="shrink-0 gap-1 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-normal text-foreground shadow-xs backdrop-blur-sm"
          :title="`Grainline: ${piece.grainline}°`"
        >
          <ArrowUp
            class="size-3.5 text-violet-600 transition-transform"
            :style="{ transform: `rotate(${piece.grainline}deg)` }"
          />
          <span class="font-mono font-semibold">{{ piece.grainline }}°</span>
          <span class="sr-only">grainline</span>
        </Badge>
      </div>
    </div>

    <div class="flex items-center justify-between gap-1.5 border-t border-border/60 px-3 py-2.5">
      <Badge variant="secondary" class="gap-1 rounded-full bg-brand-grey font-normal text-foreground">
        <Copy class="size-3" />
        Normal: <span class="font-mono font-semibold">{{ piece.normalCount }}</span>
      </Badge>
      <Badge variant="secondary" class="gap-1 rounded-full bg-brand-grey font-normal text-foreground">
        <FlipHorizontal2 class="size-3" />
        Mirrored: <span class="font-mono font-semibold">{{ piece.mirroredCount }}</span>
      </Badge>
    </div>
  </Card>
</template>