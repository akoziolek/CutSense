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
  showDimensions?: boolean
}>()
</script>

<template>
  <Card
    class="gap-0 overflow-hidden border border-muted-foreground/20 p-0 shadow-xs transition-shadow hover:shadow-md"
  >
    <!-- header: name and grainline, like the footer -->
    <div class="flex items-center justify-between gap-1.5 border-b border-border/60 px-3 py-2.5">
      <Badge
        variant="secondary"
        class="max-w-[65%] rounded-full bg-muted font-inter font-bold text-foreground"
      >
        <span class="truncate">{{ label }}</span>
      </Badge>

      <Badge
        variant="secondary"
        class="shrink-0 gap-1 rounded-full bg-muted font-normal text-foreground"
        :title="`Grainline: ${piece.grainline}°`"
      >
        <ArrowUp
          class="size-3.5 transition-transform"
          :style="{ transform: `rotate(${piece.grainline}deg)` }"
        />
        <span class="font-mono font-semibold">{{ piece.grainline }}°</span>
        <span class="sr-only">grainline</span>
      </Badge>
    </div>

    <div class="aspect-square w-full bg-muted/20">
      <PatternPieceImage
        :points="piece.points"
        :image="image"
        :label="label"
        :show-dimensions="showDimensions"
        class="h-full w-full"
      />
    </div>

    <!-- footer: counts -->
    <div class="flex items-center justify-between gap-1.5 border-t border-border/60 px-3 py-2.5">
      <Badge variant="secondary" class="gap-1 rounded-full bg-muted font-normal text-foreground">
        <Copy class="size-3" />
        Normal: <span class="font-mono font-semibold">{{ piece.normalCount }}</span>
      </Badge>
      <Badge variant="secondary" class="gap-1 rounded-full bg-muted font-normal text-foreground">
        <FlipHorizontal2 class="size-3" />
        Mirrored: <span class="font-mono font-semibold">{{ piece.mirroredCount }}</span>
      </Badge>
    </div>
  </Card>
</template>