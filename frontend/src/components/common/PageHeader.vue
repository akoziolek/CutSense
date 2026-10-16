<script setup lang="ts">
import TextHighlight from './TextHighlight.vue'

interface Props {
  title?: string
  color?: string
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  color: 'var(--brand-violet)',
  fullWidth: true,
})
</script>

<template>
  <header class="w-full flex items-center justify-between gap-4 pb-4">
    <h1 class="text-3xl font-bold tracking-tight flex-1 w-full text-left">
      <TextHighlight :full-width="fullWidth" :color="color">
        <slot>{{ title }}</slot>
      </TextHighlight>
    </h1>

    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
