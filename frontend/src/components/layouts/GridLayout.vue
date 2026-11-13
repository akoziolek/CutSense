<script setup lang="ts">
import NavigationBar from '../common/NavigationBar.vue'
</script>
<template>
  <div class="relative w-full min-h-screen flex flex-col bg-background text-foreground">
    <div class="fixed top-0 left-0 right-0 z-50">
      <div
        class="absolute inset-0 pointer-events-none bg-background/50 backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_15%,transparent_100%)]"
      />

      <NavigationBar class="relative z-10 w-full" />
    </div>
    <header class="relative w-full min-h-16 bg-grid flex flex-col pt-24 sm:pt-28">
      <slot name="header" />
    </header>

    <main class="relative w-full flex flex-1 shadow-xs">
      <div class="w-full flex-1 flex flex-col">
        <slot />
      </div>
    </main>

    <footer class="relative w-full min-h-8 bg-grid flex flex-col">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.bg-grid {
  background-image:
    linear-gradient(to right, var(--grid-color), transparent 1px),
    linear-gradient(to bottom, var(--grid-color), transparent 1px);
  background-size: 24px 24px;
}
</style>
