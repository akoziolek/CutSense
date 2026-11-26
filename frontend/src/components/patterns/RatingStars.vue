<script setup lang="ts">
import { computed } from 'vue'
import { Star } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ value: number; size?: string }>(), {
  size: 'size-5',
})

const percent = computed(() => {
  const halves = Math.round(Math.min(Math.max(props.value, 0), 5) * 2) / 2
  return (halves / 5) * 100
})
</script>

<template>
  <span class="relative inline-flex" role="img" :aria-label="`Rated ${value} out of 5`">
    <Star v-for="n in 5" :key="n" :class="[size, 'shrink-0 text-foreground']" />
    <span class="absolute inset-y-0 left-0 flex overflow-hidden" :style="{ width: `${percent}%` }">
      <Star v-for="n in 5" :key="n" :class="[size, 'shrink-0 fill-foreground text-foreground']" />
    </span>
  </span>
</template>