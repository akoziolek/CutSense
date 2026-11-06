<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10">
      <PageHeader>Optimizations</PageHeader>

      <Card class="items-center gap-3 px-6 py-10 text-center">
        <Sparkles class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">Optimization history is not available yet</h2>
        <p class="max-w-sm text-xs text-muted-foreground">
          You can prepare a configuration now. Optimization results will be saved here once the
          optimizer is integrated.
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'OptimizationNew' }">Prepare configuration</RouterLink>
        </Button>
      </Card>
    </div>

    <FloatingButton :to="{ name: 'OptimizationNew' }" />
  </GridLayout>
</template>
