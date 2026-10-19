<script setup lang="ts">
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Ruler,
  Info,
  Compass,
  Sliders,
  ArrowUp,
  ChevronDown,
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    zoomLevel: number
    threadAngle?: number
    selectedLineDistance: string | null
    hasSelectedLine: boolean
  }>(),
  {
    threadAngle: 0,
  },
)

const emit = defineEmits<{
  (e: 'update:zoomLevel', value: number): void
  (e: 'update:threadAngle', value: number): void
  (e: 'calibrateLine', customCm: number): void
  (e: 'rotate', direction: 'cw' | 'ccw'): void
  (e: 'resetLines'): void
}>()

const customLineCm = ref<string>('')
const threadAngles = [0, 45, 90, 135, 180, 225, 270, 315]

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

const zoomIn = () => {
  if (props.zoomLevel < 3) {
    emit('update:zoomLevel', Number((props.zoomLevel + 0.2).toFixed(2)))
  }
}

const zoomOut = () => {
  if (props.zoomLevel > 0.75) {
    emit('update:zoomLevel', Number((props.zoomLevel - 0.2).toFixed(2)))
  }
}
</script>

<template>
  <TooltipProvider>
    <div class="w-full lg:w-80 flex flex-col gap-4 shrink-0 select-none">
      <!-- 1. IMAGE CONTROLS -->
      <div class="p-4 bg-card border border-muted rounded-md shadow-xs space-y-3">
        <div class="flex items-center gap-2 pb-2 border-b border-border/60">
          <Sliders class="h-4 w-4 text-foreground" />
          <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
            Image Controls
          </h3>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground font-medium">Photo Zoom:</span>
          <div
            class="flex items-center gap-1 bg-muted/30 py-1 px-2 rounded-lg border border-border/50"
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              class="h-7 w-7 cursor-pointer focus-visible:ring-2"
              @click="zoomOut"
              :disabled="props.zoomLevel <= 0.75"
            >
              <ZoomOut class="h-3.5 w-3.5" />
              <span class="sr-only">Zoom out</span>
            </Button>

            <span class="text-xs font-mono px-1 min-w-12 text-center select-none font-bold">
              {{ Math.round(props.zoomLevel * 100) }}%
            </span>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              class="h-7 w-7 cursor-pointer focus-visible:ring-2"
              @click="zoomIn"
              :disabled="props.zoomLevel >= 3"
            >
              <ZoomIn class="h-3.5 w-3.5" />
              <span class="sr-only">Zoom in</span>
            </Button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground font-medium">Rotate image:</span>
          <div class="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 px-2.5 gap-1.5 text-xs cursor-pointer bg-brand-green/70 hover:bg-brand-green text-foreground border-brand-green/30 focus-visible:ring-2 focus-visible:ring-violet-500"
              title="Rotate 90° counter-clockwise"
              @click="emit('rotate', 'ccw')"
            >
              <RotateCcw class="h-3.5 w-3.5 text-brand-green-foreground" />
              <span>90°</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 px-2.5 gap-1.5 text-xs cursor-pointer bg-brand-green/70 hover:bg-brand-green text-foreground border-brand-green/30 focus-visible:ring-2 focus-visible:ring-violet-500"
              title="Rotate 90° clockwise"
              @click="emit('rotate', 'cw')"
            >
              <RotateCw class="h-3.5 w-3.5 text-brand-green-foreground" />
              <span>90°</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- 2. THREAD DIRECTION -->
      <div class="p-4 bg-card border border-muted rounded-md shadow-xs space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-border/60">
          <div class="flex items-center gap-2">
            <Compass class="h-4 w-4 text-foreground" />
            <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
              Thread Direction
            </h3>
          </div>

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-hidden"
              >
                <Info class="h-3.5 w-3.5" />
                <span class="sr-only">Thread direction info</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              :side-offset="8"
              class="max-w-xs w-fit text-pretty text-xs text-popover-foreground bg-popover/95 backdrop-blur-xs border border-border shadow-lg leading-relaxed p-3 rounded-xl"
            >
              Defines the primary thread direction (warp angle) used for nesting and pattern
              alignment.
            </TooltipContent>
          </Tooltip>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground font-medium">Primary angle:</span>

          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-lg border bg-muted/30 border-border/50 flex items-center justify-center shrink-0"
            >
              <ArrowUp
                class="h-4 w-4 text-violet-600 transition-transform duration-200 ease-out"
                :style="{ transform: `rotate(${props.threadAngle}deg)` }"
              />
            </div>

            <DropdownMenu :modal="false">
              <DropdownMenuTrigger as-child>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="w-24 h-8 px-2.5 justify-between text-xs font-mono font-semibold bg-background border border-border rounded-lg shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <span>{{ props.threadAngle }}°</span>
                  <ChevronDown class="h-3.5 w-3.5 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="bottom"
                :side-offset="6"
                class="w-24 border border-border bg-popover shadow-md p-1 rounded-xl overflow-hidden"
              >
                <DropdownMenuItem
                  v-for="deg in threadAngles"
                  :key="deg"
                  class="cursor-pointer text-xs font-mono font-medium px-3 py-1.5 rounded-md focus:bg-brand-green focus:text-foreground"
                  @select="emit('update:threadAngle', deg)"
                >
                  {{ deg }}°
                </DropdownMenuItem>

                <DropdownMenuItem
                  v-if="!threadAngles.includes(props.threadAngle)"
                  class="cursor-pointer text-xs font-mono font-medium px-3 py-1.5 rounded-md focus:bg-brand-green focus:text-foreground"
                  @select="emit('update:threadAngle', props.threadAngle)"
                >
                  {{ props.threadAngle }}°
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <!-- 3. LINE MEASUREMENT -->
      <div class="p-4 bg-card border border-muted rounded-md shadow-xs space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-border/60">
          <div class="flex items-center gap-2">
            <Ruler class="h-4 w-4 text-foreground" />
            <h3 class="text-xs font-bold font-inter text-foreground uppercase tracking-wider">
              Line Measurement
            </h3>
          </div>

          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-hidden"
              >
                <Info class="h-3.5 w-3.5" />
                <span class="sr-only">Line Measurement info</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              :side-offset="8"
              class="max-w-xs w-fit text-pretty text-xs text-popover-foreground bg-popover/95 backdrop-blur-xs border border-border shadow-lg leading-relaxed p-3 rounded-xl"
            >
              Calibrates the real-world length of the selected edge. Updating this value
              automatically rescales all other edges to maintain proper proportions.
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          class="space-y-2 transition-opacity"
          :class="props.hasSelectedLine ? 'opacity-100' : 'opacity-40 pointer-events-none'"
        >
          <span class="text-xs text-muted-foreground font-medium block">
            Selected line real length:
          </span>
          <div class="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              v-model="customLineCm"
              @change="handleLineSubmit"
              @keyup.enter="handleLineEnter"
              placeholder="e.g. 8.5"
              class="flex-1 h-8 text-xs font-mono font-semibold text-center bg-background border border-border focus-visible:ring-2 focus-visible:ring-violet-500"
            />
            <span class="text-xs text-muted-foreground font-medium">cm</span>
          </div>
        </div>

        <div class="pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-full h-8 gap-1.5 text-xs cursor-pointer font-inter bg-warning/70 hover:bg-warning text-foreground border-warning/30 focus-visible:ring-2 focus-visible:ring-violet-500"
            @click="emit('resetLines')"
          >
            <RotateCcw class="h-3.5 w-3.5 text-warning-foreground" />
            <span>Reset shape</span>
          </Button>
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
