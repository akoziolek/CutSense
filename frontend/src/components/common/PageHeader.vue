<script setup lang="ts">
import { computed, useSlots } from 'vue'
import TextHighlight from './TextHighlight.vue'

interface Props {
  title?: string
  description?: string
  color?: string
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  color: 'var(--brand-violet)',
  fullWidth: true,
})

const slots = useSlots()
const hasDescription = computed(() => !!(props.description || slots.description))
</script>

<template>
  <header
    :class="['w-full flex items-center justify-between gap-4', hasDescription ? 'pb-0' : 'pb-2']"
  >
    <h1 class="text-3xl font-bold tracking-tight flex-1 w-full text-left">
      <TextHighlight :full-width="fullWidth" :color="color">
        <slot>{{ title }}</slot>
      </TextHighlight>
    </h1>

    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
  <div>
    <p v-if="description || $slots.description" class="text-sm px-3 text-muted-foreground pb-2">
      <slot name="description">{{ description }}</slot>
    </p>
  </div>
</template>
