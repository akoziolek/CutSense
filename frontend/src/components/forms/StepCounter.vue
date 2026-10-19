<script setup lang="ts">

const props = defineProps<{
  currentStep: number
  totalSteps: number
}> ()
</script>

<template>
  <div class="text-xs sm:text-sm font-medium font-inter text-muted-foreground whitespace-nowrap">
    Step {{ props.currentStep }} of {{ props.totalSteps }}
  </div>
</template>