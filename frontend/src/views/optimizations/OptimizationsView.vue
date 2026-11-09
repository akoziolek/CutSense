<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Sparkles } from 'lucide-vue-next'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import OptimizationList from '@/components/optimizations/OptimizationList.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { login, useAuth } from '@/composables/useAuth'

const { state: auth } = useAuth()
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10">
      <PageHeader>{{ $t('optimizations.title') }}</PageHeader>

      <!-- <OptimizationList v-if="auth.user" /> -->
      
      <div class="flex flex-col items-center justify-center gap-2 py-30 text-center">
        <Sparkles class="size-10 md:size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">{{ $t('optimizations.historyUnavailable') }}</h2>
        <p class="max-w-sm text-xs text-muted-foreground">
          {{ $t('optimizations.historyDescription') }}
        </p>
        <Button as-child size="sm" class="mt-2 rounded-lg">
          <RouterLink :to="{ name: 'OptimizationNew' }">{{
            $t('optimizations.prepareConfiguration')
          }}</RouterLink>
        </Button>
      </div>
    </div>

    <FloatingButton :to="{ name: 'OptimizationNew' }" />
  </GridLayout>
</template>