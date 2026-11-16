<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps<{
  label: string
  value: string | number
  icon?: Component
  delta?: number
  deltaLabel?: string
  emptyText?: string
  loading?: boolean
  subtext?: string
}>()

const isZero = computed(() => !props.loading && Number(props.value) === 0)
</script>

<template>
  <Card
    class="border-none bg-accent text-accent-foreground shadow-none font-inter rounded-2xl py-0"
  >
    <CardContent class="px-6 py-5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium leading-5 text-accent-foreground/75">{{ label }}</span>
        <component :is="icon" v-if="icon" class="h-5 w-5 shrink-0 text-accent-foreground" />
      </div>

     <template v-if="loading">
        <Skeleton class="mt-2 h-[30px] w-14 bg-accent-foreground/10" />
        <Skeleton class="mt-2 h-5 w-36 bg-accent-foreground/10" />
      </template>

      <template v-else>
        <div
          class="mt-2 text-2xl font-bold tracking-tight leading-none"
          :class="isZero ? 'text-accent-foreground/75' : 'text-accent-foreground'"
        >
          {{ value }}
        </div>

        <div class="mt-2 text-sm leading-5">
          <slot name="subtext">
            <span v-if="isZero && emptyText" class="text-accent-foreground/75">
              {{ emptyText }}
            </span>

            <template v-else-if="delta !== undefined">
              <span v-if="delta > 0" class="text-accent-foreground/85">
                <span class="font-semibold text-green-800">+{{ delta }}</span>
                {{ deltaLabel }}
              </span>
              <span v-else class="text-accent-foreground/60">
                {{ deltaLabel }}
              </span>
            </template>

            <span v-else-if="subtext" class="text-accent-foreground/85">
              {{ subtext }}
            </span>
          </slot>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
