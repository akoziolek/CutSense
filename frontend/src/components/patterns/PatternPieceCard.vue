<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, Copy, FlipHorizontal2 } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PatternPiecePreview from '@/components/patterns/PatternPiecePreview.vue'
import type { PatternCarouselPiece } from '@/types/pattern'
import type { PieceImageSource, Point2D } from '@/types/geometry'
import { toImagePercent } from '@/utils/geometry'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  piece: PatternCarouselPiece
  label?: string
  image?: PieceImageSource
  showDimensions?: boolean
}>()

const { t } = useI18n()

// the API gives points in mm with Y up; the preview takes % of the photo with Y down
const shape = computed<Point2D[]>(() => {
  const w = props.image?.imageWidthMm
  const h = props.image?.imageHeightMm
  if (!w || !h) return []
  return props.piece.points.map((point) => toImagePercent(point, w, h))
})
</script>

<template>
  <Card
    class="gap-0 overflow-hidden border border-muted-foreground/20 p-0 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="relative aspect-square w-full bg-muted/20">
      <PatternPiecePreview
        fill
        dim-outside
        :image-url="image?.url"
        :points="shape"
        :shape-index="0"
        :image-width-mm="image?.imageWidthMm"
        :image-height-mm="image?.imageHeightMm"
        :margin="1.15"
        :show-dimensions="showDimensions"
        :reserve-top="32"
      />

      <!-- pills over the picture -->
      <div class="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <Badge
          variant="secondary"
          class="max-w-[65%] rounded-md bg-muted px-2.5 py-0.5 font-inter text-xs font-bold text-foreground shadow-xs"
        >
          <span class="truncate">{{ label || t('patterns.pieceList.piece') }}</span>
        </Badge>

        <Badge
          variant="secondary"
          class="shrink-0 gap-1 rounded-md bg-muted px-2.5 py-0.5 text-xs font-normal text-foreground shadow-xs"
          :title="t('patterns.pieceList.grainlineTitle', { angle: piece.grainline })"
        >
          <ArrowUp
            class="size-3.5 transition-transform"
            :style="{ transform: `rotate(${piece.grainline}deg)` }"
          />
          <span class="font-mono font-semibold">{{ piece.grainline }}°</span>
          <span class="sr-only">{{ t('patterns.pieceList.grainline') }}</span>
        </Badge>
      </div>
    </div>

    <!-- footer: counts -->
    <div class="flex items-center justify-between gap-1 border-t border-border/60 px-2.5 py-2">
      <Badge
        variant="secondary"
        class="gap-1 whitespace-nowrap rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-normal text-foreground"
        :title="t('patterns.pieceList.normalTitle')"
      >
        <Copy class="size-3 shrink-0" />
        <span>{{ t('patterns.pieceList.normal') }}:</span>
        <span class="font-mono font-semibold">{{ piece.normalCount }}</span>
      </Badge>
      <Badge
        variant="secondary"
        class="gap-1 whitespace-nowrap rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-normal text-foreground"
        :title="t('patterns.pieceList.mirroredTitle')"
      >
        <FlipHorizontal2 class="size-3 shrink-0" />
        <span>{{ t('patterns.pieceList.mirrored') }}:</span>
        <span class="font-mono font-semibold">{{ piece.mirroredCount }}</span>
      </Badge>
    </div>
  </Card>
</template>