<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  title?: string
  message: string
  code?: string
  retryLabel?: string
  retryButtonClass?: string
  backLabel?: string
  backButtonClass?: string
  backTo?: RouteLocationRaw
}>()

const emit = defineEmits<{
  (event: 'retry'): void
  (event: 'back'): void
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
      {{ title ?? $t('common.errors.somethingWentWrong') }}
    </h2>
    <p class="max-w-md text-sm sm:text-base text-muted-foreground mb-8">
      {{ message }}
    </p>

    <div
      v-if="props.retryLabel || props.backLabel || $slots.actions"
      class="flex flex-wrap items-center justify-center gap-3"
    >
      <Button
        v-if="props.retryLabel"
        variant="outline"
        class="rounded-lg gap-2"
        :class="props.retryButtonClass"
        @click="emit('retry')"
      >
        <RotateCcw class="w-4 h-4" />
        <span>{{ props.retryLabel }}</span>
      </Button>
      <Button
        v-if="props.backLabel && props.backTo !== undefined"
        as-child
        variant="default"
        class="rounded-lg gap-2"
        :class="props.backButtonClass"
      >
        <RouterLink :to="props.backTo">
          <ArrowLeft class="w-4 h-4" />
          <span>{{ props.backLabel }}</span>
        </RouterLink>
      </Button>
      <Button
        v-else-if="props.backLabel"
        variant="default"
        class="rounded-lg gap-2"
        :class="props.backButtonClass"
        @click="emit('back')"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>{{ props.backLabel }}</span>
      </Button>
      <slot name="actions" />
    </div>
  </div>
</template>
