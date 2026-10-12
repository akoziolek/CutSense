<script setup lang="ts">
</script>

<template>
  <div class="relative w-full min-h-screen flex flex-col bg-background text-foreground">
    <header class="relative w-full min-h-16 bg-grid flex flex-col">
      <slot name="header" />
    </header>

    <main class="relative w-full flex-1 shadow-xs">
      <div class="w-full h-full py-8 sm:py-12">
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
