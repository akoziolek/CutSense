<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RulerDimensionLine, Scissors, RotateCw, Timer } from 'lucide-vue-next'
import StatCard from '@/components/optimizations/StatCard.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { OptimizationStats } from '@/types/optimization'
import { formatAreaM2 } from '@/utils/formatData'

const props = withDefaults(
  defineProps<{
    stats?: OptimizationStats | null
    executionTime: number
    isLayoutIncomplete?: boolean
    unavailableTooltip?: string
  }>(),
  {
    stats: null,
    isLayoutIncomplete: false,
    unavailableTooltip: undefined,
  },
)

const { t } = useI18n()

const hasValidStats = computed(() => Boolean(props.stats) && !props.isLayoutIncomplete)

const tooltipMessage = computed(() => {
  if (hasValidStats.value) return undefined
  return props.unavailableTooltip || t('optimizations.statsUnavailable')
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3 min-h-7">
      <h2 class="text-xl font-bold font-inter tracking-tight text-foreground">
        {{ t('optimizations.statistics') }}
      </h2>
    </div>

    <TooltipProvider>
      <Tooltip :disabled="hasValidStats">
        <TooltipTrigger as-child>
          <div
            class="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
            :class="{ 'opacity-60 cursor-help': !hasValidStats }"
          >
            <StatCard
              :label="t('optimizations.remainingFabric')"
              :value="hasValidStats && stats ? formatAreaM2(stats.remainingFabricArea) : '—'"
              :icon="RulerDimensionLine"
            >
              <template #subtext>
                <template v-if="hasValidStats && stats">
                  <span class="font-semibold text-foreground">
                    {{ stats.remainingFabricPercentage }}%
                  </span>
                  {{ t('optimizations.ofTotalFabric') }}
                </template>
                <span v-else class="invisible" aria-hidden="true">—</span>
              </template>
            </StatCard>

            <StatCard
              :label="t('optimizations.waste')"
              :value="hasValidStats && stats ? formatAreaM2(stats.wasteArea) : '—'"
              :icon="Scissors"
            >
              <template #subtext>
                <template v-if="hasValidStats && stats">
                  <span class="font-semibold text-foreground"> {{ stats.wastePercentage }}% </span>
                  {{ t('optimizations.ofTotalFabric') }}
                </template>
                <span v-else class="invisible" aria-hidden="true">—</span>
              </template>
            </StatCard>

            <StatCard
              :label="t('optimizations.usableScraps')"
              :value="hasValidStats && stats ? formatAreaM2(stats.usableScrapsArea) : '—'"
              :icon="RotateCw"
            >
              <template #subtext>
                <template v-if="hasValidStats && stats">
                  <span class="font-semibold text-brand-green-foreground">
                    {{ stats.usableScrapsPercentage }}%
                  </span>
                  {{ t('optimizations.ofTotalFabric') }}
                </template>
                <span v-else class="invisible" aria-hidden="true">—</span>
              </template>
            </StatCard>

            <StatCard
              :label="t('optimizations.executionTime')"
              :value="`${executionTime} ms`"
              :icon="Timer"
            >
              <template #subtext>
                <span class="invisible" aria-hidden="true">—</span>
              </template>
            </StatCard>
          </div>
        </TooltipTrigger>

        <TooltipContent
          v-if="!hasValidStats && tooltipMessage"
          align="end"
          class="w-84 border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        >
          {{ tooltipMessage }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </section>
</template>
