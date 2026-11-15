<script setup lang="ts">
import { Card } from '@/components/ui/card'

defineProps<{
  title: string
  description?: string
  selected?: boolean
}>()

const emit = defineEmits<{ (e: 'select'): void }>()
</script>

<template>
  <button
    type="button"
    class="group block w-full cursor-pointer rounded-xl text-left focus-visible:outline-none"
    :aria-pressed="selected ?? false"
    @click="emit('select')"
  >
    <Card
      class="items-center gap-3 border-1 px-6 sm:py-20 text-center transition-all duration-200 group-hover:shadow-lg! hover:bg-card/80 group-focus-visible:ring-2 group-focus-visible:ring-ring"
      :class="selected ? 'border-muted-foreground shadow-lg' : 'border-muted'"
    >
      <div
        class="flex size-20 items-center justify-center rounded-full transition-colors"
        :class="selected ? 'bg-brand-green text-brand-green-foreground' : 'bg-muted'"
      >
        <slot name="icon" />
      </div>
      <h3 class="text-sm font-bold font-inter text-foreground">{{ title }}</h3>
      <p v-if="description" class="max-w-[14rem] text-xs text-muted-foreground">
        {{ description }}
      </p>
    </Card>
  </button>
</template>
