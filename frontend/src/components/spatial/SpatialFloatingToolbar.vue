<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Hand, Ruler, Eye, EyeOff, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  activeTool: 'select' | 'pan'
  isMoveMode?: boolean
  showLabels: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:activeTool', tool: 'select' | 'pan'): void
  (e: 'update:showLabels', value: boolean): void
  (e: 'deleteSelected'): void
}>()
</script>

<template>
  <div class="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-xs">
    <!-- Ruler Tool -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer"
      :class="props.activeTool === 'select' && !props.isMoveMode ? 'bg-brand-green text-foreground' : ''"
      title="Ruler tool (Drag line to add point)"
      @click="emit('update:activeTool', 'select')"
    >
      <Ruler class="h-3.5 w-3.5" />
      <span class="sr-only">Ruler tool</span>
    </Button>

    <!-- Pan Tool -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer"
      :class="props.isMoveMode ? 'bg-brand-green text-foreground' : ''"
      title="Pan tool (Drag image or select line)"
      @click="emit('update:activeTool', 'pan')"
    >
      <Hand class="h-3.5 w-3.5" />
      <span class="sr-only">Pan tool</span>
    </Button>

    <!-- Toggle Labels -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer"
      :class="props.showLabels ? 'bg-brand-green text-foreground' : ''"
      :title="props.showLabels ? 'Hide length labels' : 'Show length labels'"
      @click="emit('update:showLabels', !props.showLabels)"
    >
      <Eye v-if="props.showLabels" class="h-3.5 w-3.5" />
      <EyeOff v-else class="h-3.5 w-3.5" />
      <span class="sr-only">Toggle labels</span>
    </Button>

    <div class="w-px h-4 bg-border mx-0.5" />

    <!-- Delete Selected -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg transition-colors cursor-pointer"
      :class="
        props.canDelete
          ? 'text-destructive hover:bg-destructive/15 hover:text-destructive'
          : 'text-muted-foreground/30 cursor-not-allowed'
      "
      :disabled="!props.canDelete"
      title="Delete selected point or edge (Delete / Backspace)"
      @click="emit('deleteSelected')"
    >
      <Trash2 class="h-3.5 w-3.5" />
      <span class="sr-only">Delete selected</span>
    </Button>
  </div>
</template>