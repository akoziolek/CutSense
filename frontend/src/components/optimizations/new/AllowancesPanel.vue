<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  MAX_CUTTING_ALLOWANCE_CM,
  MAX_SEAM_ALLOWANCE_CM,
  isValidAllowanceCm,
} from '@/utils/optimizationConfig'

const seam = defineModel<string>('seam', { required: true })
const cutting = defineModel<string>('cutting', { required: true })

const fields = [
  {
    id: 'seam-allowance',
    label: 'Seam allowance',
    max: MAX_SEAM_ALLOWANCE_CM,
    info: 'Defines the distance between the stitching line and the raw edge of the fabric. This ensures that the final product retains its intended measurements once all pieces are sewn together.',
  },
  {
    id: 'cutting-allowance',
    label: 'Cutting allowance',
    max: MAX_CUTTING_ALLOWANCE_CM,
    info: 'Provides extra buffer space so you can maneuver shears or a rotary blade freely without accidentally slicing into neighboring pattern pieces or causing fabric shifting.',
  },
] as const

const models = { 'seam-allowance': seam, 'cutting-allowance': cutting }
</script>

<template>
  <TooltipProvider>
    <div class="w-full shrink-0 space-y-4 rounded-md border border-muted bg-card p-4 shadow-xs lg:w-80">
      <div v-for="field in fields" :key="field.id" class="space-y-1.5">
        <div class="flex items-center gap-1.5">
          <Label :for="field.id" class="text-sm font-bold font-inter text-foreground">
            {{ field.label }} <span class="text-destructive">*</span>
          </Label>
          <Tooltip>
            <TooltipTrigger as-child>
              <button
                type="button"
                class="cursor-help text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden"
              >
                <Info class="h-3.5 w-3.5" />
                <span class="sr-only">{{ field.label }} info</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              :side-offset="8"
              class="max-w-xs w-fit text-xs text-popover-foreground bg-popover/95 border border-border p-3 rounded-xl"
            >
              {{ field.info }}
            </TooltipContent>
          </Tooltip>
        </div>

        <div class="relative">
          <Input
            :id="field.id"
            type="number"
            step="0.1"
            min="0"
            :max="field.max"
            :model-value="models[field.id].value"
            class="h-8 pr-9 text-xs"
            @update:model-value="(v: string | number) => (models[field.id].value = String(v ?? ''))"
          />
          <span
            class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
          >
            cm
          </span>
        </div>

        <p
          v-if="!isValidAllowanceCm(models[field.id].value, field.max)"
          class="text-xs text-destructive"
          role="alert"
        >
          Enter a value between 0 and {{ field.max }} cm.
        </p>
      </div>
    </div>
  </TooltipProvider>
</template>