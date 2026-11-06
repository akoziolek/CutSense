<script setup lang="ts">
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Ruler, Info, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  selectedLineDistance: string | null
  hasSelectedLine: boolean
}>()

const emit = defineEmits<{
  (e: 'calibrateLine', customCm: number): void
  (e: 'resetLines'): void
}>()

const customLineCm = ref<string>('')

watch(
  () => [props.selectedLineDistance, props.hasSelectedLine],
  ([newVal, hasLine]) => {
    if (!hasLine) {
      customLineCm.value = ''
    } else {
      customLineCm.value = (newVal as string) || ''
    }
  },
  { immediate: true },
)

const handleLineSubmit = (e: Event) => {
  const input = e.target as HTMLInputElement
  const num = Number(input.value)
  if (!isNaN(num) && num > 0) {
    emit('calibrateLine', num)
  } else {
    customLineCm.value = props.selectedLineDistance || ''
  }
}

const handleLineEnter = (e: KeyboardEvent) => {
  ;(e.target as HTMLInputElement).blur()
}
</script>

<template>
  <TooltipProvider>
    <div class="p-4 bg-card border border-muted rounded-md shadow-xs space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-border/60">
        <div class="flex items-center gap-2">
          <Ruler class="h-4 w-4 text-foreground" />
          <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
            {{ $t('spatial.lineMeasurement') }}
          </h3>
        </div>

        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-hidden"
            >
              <Info class="h-3.5 w-3.5" />
              <span class="sr-only">{{ $t('spatial.lineMeasurementInfo') }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            :side-offset="8"
            class="max-w-xs w-fit text-xs text-popover-foreground bg-popover/95 border border-border p-3 rounded-xl"
          >
            {{ $t('spatial.calibrationDescription') }}
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        class="space-y-2 transition-opacity"
        :class="props.hasSelectedLine ? 'opacity-100' : 'opacity-40 pointer-events-none'"
      >
        <span class="text-xs text-muted-foreground font-medium block">
          {{ $t('spatial.selectedLineLength') }}
        </span>
        <div class="flex items-center gap-2">
          <Input
            type="number"
            step="0.1"
            min="0.1"
            v-model="customLineCm"
            @change="handleLineSubmit"
            @keyup.enter="handleLineEnter"
            :placeholder="$t('spatial.lineLengthPlaceholder')"
            class="flex-1 h-8 text-xs font-mono font-semibold text-center bg-background border border-border focus-visible:ring-2"
          />
          <span class="text-xs text-muted-foreground font-medium">cm</span>
        </div>
      </div>

      <div class="pt-2 border-t border-border/40">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-full h-8 gap-1.5 text-xs cursor-pointer font-inter bg-warning/70 hover:bg-warning text-foreground border-warning/30"
          @click="emit('resetLines')"
        >
          <RotateCcw class="h-3.5 w-3.5 text-warning-foreground" />
          <span>{{ $t('spatial.resetShape') }}</span>
        </Button>
      </div>
    </div>
  </TooltipProvider>
</template>
