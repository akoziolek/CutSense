<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Image as ImageIcon,
  ImageOff,
  Eye,
  EyeOff,
  Tag,
  Undo2,
  Redo2,
} from 'lucide-vue-next'

defineProps<{
  zoomLevel: number
  minZoom: number
  maxZoom: number
  editable: boolean
  canUndo: boolean
  canRedo: boolean
  showAllowances: boolean
  showCoordinates: boolean
  showPieceNumbers: boolean
  hasPhoto: boolean
  showPhoto: boolean
  isExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'reset-view'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'update:showAllowances', value: boolean): void
  (e: 'update:showCoordinates', value: boolean): void
  (e: 'update:showPieceNumbers', value: boolean): void
  (e: 'update:showPhoto', value: boolean): void
  (e: 'update:isExpanded', value: boolean): void
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="bg-brand-green px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-brand-green-foreground"
  >
    <div class="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
        :disabled="zoomLevel <= minZoom"
        :title="t('optimizations.zoomOut')"
        @click="emit('zoom-out')"
      >
        <ZoomOut class="h-3.5 w-3.5" />
      </Button>
      <span class="text-[11px] font-mono font-bold px-1.5 min-w-10 text-center">
        {{ Math.round(zoomLevel * 100) }}%
      </span>
      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
        :disabled="zoomLevel >= maxZoom"
        :title="t('optimizations.zoomIn')"
        @click="emit('zoom-in')"
      >
        <ZoomIn class="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
        :title="t('optimizations.fitToView')"
        @click="emit('reset-view')"
      >
        <RotateCcw class="h-3.5 w-3.5" />
      </Button>

      <template v-if="editable">
        <div class="h-3.5 w-px bg-foreground/20 mx-1" />

        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
          :disabled="!canUndo"
          :title="t('actions.undo', 'Undo')"
          @click="emit('undo')"
        >
          <Undo2 class="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
          :disabled="!canRedo"
          :title="t('actions.redo', 'Redo')"
          @click="emit('redo')"
        >
          <Redo2 class="h-3.5 w-3.5" />
        </Button>
      </template>

      <div class="h-3.5 w-px bg-foreground/20 mx-1" />

      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md transition-colors cursor-pointer"
        :class="
          showAllowances
            ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
            : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
        "
        :title="t(showAllowances ? 'optimizations.hideAllowances' : 'optimizations.showAllowances')"
        @click="emit('update:showAllowances', !showAllowances)"
      >
        <Layers class="h-3.5 w-3.5" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md transition-colors cursor-pointer"
        :class="
          showCoordinates
            ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
            : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
        "
        :title="
          t(showCoordinates ? 'optimizations.hideCoordinates' : 'optimizations.showCoordinates')
        "
        @click="emit('update:showCoordinates', !showCoordinates)"
      >
        <Eye v-if="showCoordinates" class="h-3.5 w-3.5" />
        <EyeOff v-else class="h-3.5 w-3.5" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md transition-colors cursor-pointer"
        :class="
          showPieceNumbers
            ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
            : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
        "
        :title="
          t(showPieceNumbers ? 'optimizations.hidePieceLabels' : 'optimizations.showPieceLabels')
        "
        @click="emit('update:showPieceNumbers', !showPieceNumbers)"
      >
        <Tag class="h-3.5 w-3.5" />
      </Button>

      <Button
        v-if="hasPhoto"
        size="icon"
        variant="ghost"
        class="h-7 w-7 rounded-md transition-colors cursor-pointer"
        :class="
          showPhoto
            ? 'bg-brand-green-foreground/15 text-brand-green-foreground font-bold'
            : 'hover:bg-brand-green-foreground/10 text-brand-green-foreground/70'
        "
        :title="t(showPhoto ? 'optimizations.hidePhoto' : 'optimizations.showPhoto')"
        @click="emit('update:showPhoto', !showPhoto)"
      >
        <ImageIcon v-if="showPhoto" class="h-3.5 w-3.5" />
        <ImageOff v-else class="h-3.5 w-3.5" />
      </Button>
    </div>

    <Button
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-md text-brand-green-foreground transition-colors hover:bg-brand-green-foreground/10 cursor-pointer"
      :title="t(isExpanded ? 'optimizations.collapsePreview' : 'optimizations.expandPreview')"
      @click="emit('update:isExpanded', !isExpanded)"
    >
      <Minimize2 v-if="isExpanded" class="h-3.5 w-3.5" />
      <Maximize2 v-else class="h-3.5 w-3.5" />
    </Button>
  </div>
</template>
