<script setup lang="ts">
import { type Component } from 'vue'
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  label: string
  value: string | number
  subtext?: string
  icon?: Component
}>()
</script>

<template>
  <Card
    class="border-none bg-brand-green shadow-xs font-inter rounded-md py-4 min-h-24 sm:min-h-[104px] flex flex-col justify-center"
  >
    <CardContent class="space-y-1 px-4">
      <div class="flex items-start justify-between gap-2 text-xs font-medium text-foreground">
        <span>{{ label }}</span>
        <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0" />
      </div>

      <div class="text-xl font-bold tracking-tight text-foreground leading-tight">
        {{ value }}
      </div>

      <div
        v-if="subtext !== undefined || $slots.subtext"
        class="pt-0.5 text-[11px] font-normal leading-tight text-brand-green-foreground/80 min-h-[15px]"
      >
        <slot name="subtext">
          {{ subtext }}
        </slot>
      </div>
    </CardContent>
  </Card>
</template>