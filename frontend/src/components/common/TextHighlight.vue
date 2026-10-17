<script setup lang="ts">
interface Props {
  as?: string
  color?: string
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'span',
  color: 'var(--brand-violet)',
  fullWidth: false,
})
</script>

<template>
  <component
    :is="props.as"
    class="font-inter px-3 sm:px-4 font-bold tracking-tight text-foreground leading-[1.3] [box-decoration-break:clone] bg-no-repeat bg-[length:100%_55%] bg-[position:0_75%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    :class="fullWidth ? 'block w-full' : 'inline'"
    :style="{
      backgroundImage: `linear-gradient(to right, ${color}, ${color})`,
    }"
  >
    <slot />
  </component>
</template>
