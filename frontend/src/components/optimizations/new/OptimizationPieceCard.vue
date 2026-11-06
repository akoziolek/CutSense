<script setup lang="ts">
import { Copy, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import SidebarThreadDirection from '@/components/spatial/sidebar/SidebarThreadDirection.vue'
import PatternPiecePreview from '@/components/patterns/PatternPiecePreview.vue'
import type { Point2D } from '@/types/geometry'
import type { OptimizationPieceConfig } from '@/types/optimization'
import { MAX_PIECE_COPIES } from '@/utils/optimizationConfig'
import type { PieceImageSource } from '@/types/geometry'

const props = defineProps<{
  piece: OptimizationPieceConfig
  label: string
  points: Point2D[]
  imageUrl?: string
  shapeIndex: number
  allShapes: Point2D[][]
  image?: PieceImageSource
  canDelete: boolean
}>()

const emit = defineEmits<{
  (e: 'update', partial: Partial<Omit<OptimizationPieceConfig, 'key'>>): void
  (e: 'duplicate'): void
  (e: 'remove'): void
}>()

const quantityFields = [
  { key: 'normalCount', label: 'normal' },
  { key: 'mirroredCount', label: 'mirrored' },
] as const

const onQuantity = (key: (typeof quantityFields)[number]['key'], raw: string | number) => {
  const parsed = parseInt(String(raw), 10)
  const value = Number.isNaN(parsed) ? 0 : Math.min(MAX_PIECE_COPIES, Math.max(0, parsed))
  emit('update', { [key]: value })
}
</script>

<template>
  <article
    class="flex flex-col items-center gap-5 overflow-hidden rounded-md border border-muted bg-card p-4 shadow-xs transition-all hover:shadow-md sm:p-5 xl:flex-row xl:items-start"
  >
    <PatternPiecePreview
      :image-url="imageUrl"
      :points="points"
      :shape-index="shapeIndex"
      :all-shapes="allShapes"
    />

    <div class="flex w-full min-w-0 flex-1 flex-col py-0.5">
      <div class="mb-4 flex items-center justify-between gap-4 border-b border-border/60 pb-2">
        <h2 class="truncate text-xl font-bold font-inter tracking-tight text-foreground">
          {{ label }}
        </h2>
        <div class="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-8 w-8 cursor-pointer rounded-lg"
            :title="$t('optimizations.duplicatePieceDescription')"
            @click="emit('duplicate')"
          >
            <Copy class="h-4 w-4" />
            <span class="sr-only">{{ $t('optimizations.duplicatePiece') }}</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            class="h-8 w-8 cursor-pointer rounded-lg bg-destructive/15 text-destructive transition-colors hover:bg-destructive/20 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canDelete"
            :title="$t('optimizations.removePiece')"
            @click="emit('remove')"
          >
            <Trash2 class="h-4 w-4" />
            <span class="sr-only">{{ $t('optimizations.removePiece') }}</span>
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-4 md:flex-row xl:items-center xl:gap-8">
        <div class="shrink-0 space-y-2">
          <h3 class="text-xs font-bold font-inter uppercase tracking-wider text-foreground">
            {{ $t('optimizations.numberOfPieces') }}
          </h3>
          <div class="flex items-center gap-3 pt-0.5 text-xs sm:gap-4">
            <label v-for="field in quantityFields" :key="field.key" class="flex items-center gap-2 font-medium">
              <span class="text-muted-foreground">{{ $t(`patterns.${field.label}`) }}:</span>
              <Input
                type="number"
                min="0"
                :max="MAX_PIECE_COPIES"
                :model-value="piece[field.key]"
                class="h-8 w-14 border border-border bg-background text-center font-mono text-xs font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                @update:model-value="(v: string | number) => onQuantity(field.key, v)"
              />
            </label>
          </div>
          <p
            v-if="piece.normalCount + piece.mirroredCount === 0"
            class="max-w-[16rem] text-xs text-destructive"
            role="alert"
          >
            {{ $t('optimizations.pieceNeedsCopy') }}
          </p>
        </div>

        <div class="hidden h-10 w-px shrink-0 self-center bg-border/60 xl:block" />

        <div
          class="w-full max-w-[260px] shrink-0 space-y-2 [&_div.bg-card]:border-none [&_div.bg-card]:p-0 [&_div.bg-card]:shadow-none [&_div.border-b]:mb-2 [&_div.border-b]:border-b-0"
        >
          <SidebarThreadDirection
            :thread-angle="piece.direction"
            @update:thread-angle="(value: number) => emit('update', { direction: value })"
          />
          <div class="flex items-center gap-2">
            <Switch
              :id="`two-way-${piece.key}`"
              :model-value="piece.twoWay"
              @update:model-value="(value: boolean) => emit('update', { twoWay: value })"
            />
            <Label
              :for="`two-way-${piece.key}`"
              class="cursor-pointer text-xs font-medium"
              :title="$t('optimizations.allow180Rotation')"
            >
              {{ $t('optimizations.twoWay') }}
            </Label>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
