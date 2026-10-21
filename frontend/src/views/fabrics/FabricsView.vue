<script setup lang="ts">
import FloatingButton from '@/components/common/FloatingButton.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex items-center justify-center text-muted-foreground">
      Coming soon
    </div>

    <FloatingButton :to="{ name: 'AddFabric'}" />
  </GridLayout>
</template>
