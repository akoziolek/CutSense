<script setup lang="ts">
import NavigationBar from '../common/NavigationBar.vue'
</script>

<template>
  <div class="relative w-full min-h-screen flex flex-col bg-background text-foreground">
    <NavigationBar class="fixed top-0 left-0 right-0 z-50 pointer-events-none" />
    <header class="relative w-full min-h-16 bg-grid flex flex-col pt-20 sm:pt-24">
      <slot name="header" />
    </header>

    <main class="relative w-full flex-1 shadow-xs">
      <div class="w-full h-full">
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
    linear-gradient(to right, rgba(0, 0, 0, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
}
</style>
