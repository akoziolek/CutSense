<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { AlertTriangle, ArrowLeft } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
      <div
        class="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-6 shadow-sm"
      >
        <AlertTriangle class="w-10 h-10 stroke-[2.2]" />
      </div>

      <span class="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-2">
        Error 404
      </span>
      <h1
        class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-inter mb-3"
      >
        Page not found
      </h1>
      <p class="max-w-md text-sm sm:text-base text-muted-foreground mb-8">
        We're sorry, we couldn't find the page you requested. The page might have been removed, had
        its name changed, or is temporarily unavailable.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button as-child variant="default" class="rounded-lg px-5 font-inter font-medium shadow-sm">
          <RouterLink to="/" class="inline-flex items-center gap-2">
            <ArrowLeft class="w-4 h-4" />
            <span>Back to Home</span>
          </RouterLink>
        </Button>
      </div>
    </div>
  </GridLayout>
</template>
