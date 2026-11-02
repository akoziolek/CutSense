<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Search } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Initial state: no optimizations yet
const optimizations = ref([])
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10">
      <PageHeader>
        <span>Optimizations</span>
        <span class="ml-3 text-sm font-semibold">(0 found)</span>
      </PageHeader>

      <!-- Search & Filter bar (placeholders for now) -->
      <div class="flex flex-wrap items-center gap-2 opacity-60">
        <div class="relative flex-1 min-w-48">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input disabled placeholder="Search optimizations..." class="h-9 pl-9" />
        </div>
        <Button variant="outline" size="sm" class="gap-2" disabled>
          Filter
        </Button>
      </div>

      <!-- Empty State -->
      <div
        v-if="optimizations.length === 0"
        class="flex flex-col items-center justify-center gap-3 py-24 text-center"
      >
        <div class="rounded-full bg-muted p-4 text-muted-foreground">
          <Search class="size-8" />
        </div>
        <h2 class="text-base font-bold font-inter">No optimizations yet</h2>
        <p class="max-w-sm text-xs text-muted-foreground leading-relaxed">
          Automatically calculate the most efficient cutting layout, minimize material waste, and save time.
        </p>
        <Button as-child size="sm" class="mt-3 rounded-lg gap-2">
          <RouterLink :to="{ name: 'OptimizationWizard' }">
            Start new optimization
          </RouterLink>
        </Button>
      </div>
    </div>

    <!-- Floating action button -->
    <FloatingButton :to="{ name: 'OptimizationWizard' }" />
  </GridLayout>
</template>