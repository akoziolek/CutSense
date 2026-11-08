<script setup lang="ts">

const props = defineProps<{
  currentStep: number
  totalSteps: number
}> ()
</script>

<template>
  <div class="text-xs sm:text-sm font-medium font-inter text-muted-foreground whitespace-nowrap">
    {{ $t('common.status.stepOf', { current: props.currentStep, total: props.totalSteps }) }}
  </div>
</template>