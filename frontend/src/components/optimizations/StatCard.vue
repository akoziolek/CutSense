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
  <Card class="border-none bg-brand-green shadow-xs font-inter rounded-md py-4">
    <CardContent class="space-y-1 px-4">
      <div class="flex items-center justify-between text-xs font-medium text-foreground">
        <span>{{ label }}</span>
        <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0" />
      </div>

      <div class="text-xl font-bold tracking-tight text-foreground leading-tight">
        {{ value }}
      </div>

      <div v-if="subtext || $slots.subtext" class="text-[11px] text-zinc-600 font-normal leading-tight pt-0.5">
        <slot name="subtext">
          {{ subtext }}
        </slot>
      </div>
    </CardContent>
  </Card>
</template>