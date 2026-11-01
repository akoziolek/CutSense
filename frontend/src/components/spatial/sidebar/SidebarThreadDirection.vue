<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Compass, Info, ArrowUp, ChevronDown } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    threadAngle?: number
  }>(),
  {
    threadAngle: 0,
  },
)

const emit = defineEmits<{
  (e: 'update:threadAngle', value: number): void
}>()

const threadAngles = [0, 45, 90, 135, 180, 225, 270, 315]
</script>

<template>
  <TooltipProvider>
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
            class="max-w-xs w-fit text-xs text-popover-foreground bg-popover/95 border border-border p-3 rounded-xl"
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
                class="w-24 h-8 px-2.5 justify-between hover:bg-brand-green/70 text-xs font-mono font-semibold bg-background border border-border rounded-lg shadow-xs cursor-pointer"
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
