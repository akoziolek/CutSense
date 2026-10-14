<script setup lang="ts">
  withDefaults(
    defineProps<{
      as?: string
      color?: string
    }>(),
    {
      as: 'span',
      color: 'var(--brand-violet)',
    }
  )
</script>

<template>
  <component
    :is="as"
    class="font-inter inline px-3 sm:px-4 font-bold tracking-tight text-foreground leading-[1.3] [box-decoration-break:clone] bg-no-repeat bg-[length:100%_55%] bg-[position:0_75%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    :style="{
      backgroundImage: `linear-gradient(to right, ${color}, ${color})`,
    }"
  >
    <slot />
  </component>
</template>