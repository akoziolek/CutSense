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
      <PageHeader>Optimizations</PageHeader>

      <OptimizationList v-if="auth.user" />

      <Card v-else class="items-center gap-3 px-6 py-10 text-center">
        <Sparkles class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">Sign in to see your saved optimizations</h2>
        <p class="max-w-sm text-xs text-muted-foreground">
          You can run an optimization without an account. Sign in to save results and find them
          here.
        </p>
        <div class="mt-2 flex gap-2">
          <Button as-child size="sm" class="rounded-lg">
            <RouterLink :to="{ name: 'OptimizationNew' }">New optimization</RouterLink>
          </Button>
          <Button variant="outline" size="sm" class="rounded-lg" @click="login('/optimizations')">
            Sign in
          </Button>
        </div>
      </Card>
    </div>

    <FloatingButton :to="{ name: 'OptimizationNew' }" />
  </GridLayout>
</template>