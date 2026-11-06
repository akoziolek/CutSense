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
    class="relative aspect-square w-full gap-0 overflow-hidden border border-muted-foreground/20 bg-muted/20 p-0 shadow-xs transition-shadow hover:shadow-md"
  >
    <PatternPieceImage
      :points="piece.points"
      :image="image"
      :label="label"
      :margin="1.7"
      class="absolute inset-0 h-full w-full"
    />

    <div class="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <span
        class="max-w-[70%] truncate rounded-md bg-background/85 px-2 py-1 text-xs font-bold font-inter text-foreground shadow-xs backdrop-blur-sm"
      >
        {{ label }}
      </span>
      <span
        class="flex size-7 shrink-0 items-center justify-center rounded-md bg-background/85 shadow-xs backdrop-blur-sm"
        :title="`Grainline: ${piece.grainline}°`"
      >
        <ArrowUp
          class="size-4 text-violet-600"
          :style="{ transform: `rotate(${piece.grainline}deg)` }"
        />
        <span class="sr-only">Grainline {{ piece.grainline }}°</span>
      </span>
    </div>

    <div class="absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" class="gap-1 rounded-md bg-background/85 font-normal text-foreground backdrop-blur-sm">
        <Copy class="size-3" />
        Normal: <span class="font-mono font-semibold">{{ piece.normalCount }}</span>
      </Badge>
      <Badge variant="secondary" class="gap-1 rounded-md bg-background/85 font-normal text-foreground backdrop-blur-sm">
        <FlipHorizontal2 class="size-3" />
        Mirrored: <span class="font-mono font-semibold">{{ piece.mirroredCount }}</span>
      </Badge>
    </div>
  </Card>
</template>