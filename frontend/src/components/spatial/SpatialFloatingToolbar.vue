<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Hand, Ruler, Trash2, Eye, EyeOff } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    activeTool: 'select' | 'pan'
    isMoveMode?: boolean
    showLabels?: boolean
    showLabelToggle?: boolean
    canDelete?: boolean
  }>(),
  {
    showLabels: true,
    showLabelToggle: true,
    isMoveMode: false,
    canDelete: false,
  },
)

const emit = defineEmits<{
  (e: 'update:activeTool', tool: 'select' | 'pan'): void
  (e: 'update:showLabels', value: boolean): void
  (e: 'deleteSelected'): void
}>()
</script>

<template>
  <!-- {click, mousedown}.stop = stop event from being sent to canvas when clicking the toolbar -->
  <div
    class="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-xs select-none"
    @click.stop
    @mousedown.stop
  >
    <!-- Ruler Tool -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer transition-colors"
      :class="
        props.activeTool === 'select' && !props.isMoveMode ? 'bg-accent text-accent-foreground' : ''
      "
      :title="$t('spatial.rulerTool')"
      @click.stop="emit('update:activeTool', 'select')"
    >
      <Ruler class="h-3.5 w-3.5" />
      <span class="sr-only">{{ $t('spatial.editTool') }}</span>
    </Button>

    <!-- Pan Tool -->
    <Button
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer transition-colors"
      :class="props.isMoveMode ? 'bg-accent text-accent-foreground' : ''"
      :title="$t('spatial.panToolDescription')"
      @click.stop="emit('update:activeTool', 'pan')"
    >
      <Hand class="h-3.5 w-3.5" />
      <span class="sr-only">{{ $t('spatial.panTool') }}</span>
    </Button>

    <!-- Toggle Labels -->
    <Button
      v-if="props.showLabelToggle"
      type="button"
      size="icon"
      variant="ghost"
      class="h-7 w-7 rounded-lg cursor-pointer transition-colors"
      :title="$t(props.showLabels ? 'spatial.hideSizeLabels' : 'spatial.showSizeLabels')"
      @click.stop="emit('update:showLabels', !props.showLabels)"
    >
      <Eye v-if="props.showLabels" class="h-3.5 w-3.5" />
      <EyeOff v-else class="h-3.5 w-3.5" />
      <span class="sr-only">{{ $t('spatial.toggleLabels') }}</span>
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
          ? 'text-destructive hover:bg-destructive/15! hover:text-destructive! '
          : 'text-muted-foreground/30 cursor-not-allowed'
      "
      :disabled="!props.canDelete"
      :title="$t('spatial.deleteShapeSelection')"
      @click.stop="emit('deleteSelected')"
    >
      <Trash2 class="h-3.5 w-3.5" />
      <span class="sr-only">{{ $t('spatial.deleteSelected') }}</span>
    </Button>
  </div>
</template>
