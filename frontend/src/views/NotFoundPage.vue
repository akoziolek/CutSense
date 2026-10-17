<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex items-center justify-center">
      <ErrorState
        code="Error 404"
        title="Page not found"
        message="We're sorry, we couldn't find the page you requested. The page might have been removed, had its name changed, or is temporarily unavailable."
      >
        <template #actions>
          <Button
            as-child
            variant="default"
            class="rounded-lg px-5 font-inter font-medium shadow-sm"
          >
            <RouterLink to="/" class="inline-flex items-center gap-2">
              <ArrowLeft class="w-4 h-4" />
              <span>Back to Home</span>
            </RouterLink>
          </Button>
        </template>
      </ErrorState>
    </div>
  </GridLayout>
</template>
