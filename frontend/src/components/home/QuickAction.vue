<script setup lang="ts">
import { type Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
  label: string
  subtext?: string
  icon?: Component
  to: RouteLocationRaw
}>()
</script>

<template>
  <RouterLink
    :to="to"
    class="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <Card
      class="h-full rounded-xl font-inter border border-muted bg-popover py-0 shadow-none transition-all duration-150 group-hover:white/90 group-hover:shadow-sm group-active:scale-[0.995]"
    >
      <CardContent class="flex h-full items-center gap-4 px-5 py-4">
        <div
          v-if="icon"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-black"
        >
          <component :is="icon" class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1 space-y-0.5">
          <div class="text-base text-popover-foreground font-bold leading-snug">
            {{ label }}
          </div>

          <div
            v-if="subtext || $slots.subtext"
            class="text-sm text-muted-foreground font-normal leading-snug"
          >
            <slot name="subtext">
              {{ subtext }}
            </slot>
          </div>
        </div>

        <ArrowRight
          class="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-1 group-hover:text-zinc-900"
        />
      </CardContent>
    </Card>
  </RouterLink>
</template>
