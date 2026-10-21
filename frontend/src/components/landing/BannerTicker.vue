<script setup lang="ts">
interface Props {
  items?: string[]
}

withDefaults(defineProps<Props>(), {
  items: () => [
    'Sign up to access all the features',
    'Now you can change website theme',
    'Share patterns with others',
    'Optimize fabric layout with ease',
    'Try out new nesting algorithms',
    'Change language and customize website to your needs'
  ],
})
</script>

<template>
  <div class="relative w-full overflow-hidden bg-accent text-accent-foreground py-2 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),inset_0_-2px_4px_rgba(0,0,0,0.06)]">
    <div class="flex w-max items-center animate-ticker">
      
      <div class="flex items-center shrink-0">
        <template v-for="(text, index) in items" :key="`item-1-${index}`">
          <span class="text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap px-8">
            {{ text }}
          </span>
          <span class="font-bold text-xs opacity-60">|</span>
        </template>
      </div>

      <div class="flex items-center shrink-0" aria-hidden="true">
        <template v-for="(text, index) in items" :key="`item-2-${index}`">
          <span class="text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap px-8">
            {{ text }}
          </span>
          <span class="font-bold text-xs opacity-60">|</span>
        </template>
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes ticker {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-ticker {
  animation: ticker 20s linear infinite;
}
</style>