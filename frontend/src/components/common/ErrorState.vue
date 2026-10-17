<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

defineProps<{
  title?: string
  message: string
  code?: string
}>()
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center text-center px-4 py-12">
    <div
      class="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-6 shadow-sm"
    >
      <AlertTriangle class="w-10 h-10 stroke-[2.2]" />
    </div>

    <span
      v-if="code"
      class="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-2"
    >
      {{ code }}
    </span>
    <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-inter mb-3">
      {{ title ?? 'Something went wrong' }}
    </h2>
    <p class="max-w-md text-sm sm:text-base text-muted-foreground mb-8">
      {{ message }}
    </p>

    <div v-if="$slots.actions" class="flex flex-wrap items-center justify-center gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
