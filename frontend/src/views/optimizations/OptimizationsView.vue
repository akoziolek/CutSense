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
import { useI18n } from 'vue-i18n'

const { state: auth } = useAuth()
const { t } = useI18n()
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-10">
      <PageHeader>{{ t('optimizations.title') }}</PageHeader>

      <OptimizationList v-if="auth.user" />

      <div v-else class="flex flex-col items-center justify-center gap-2 py-30 text-center">
        <Sparkles class="size-12 text-muted-foreground" />
        <h2 class="text-lg font-bold font-inter">
          {{ t('optimizations.signInToSee') }}
        </h2>
        <p class="max-w-sm text-xs text-muted-foreground">
          {{ t('optimizations.guestDescription') }}
        </p>
        <div class="mt-2 flex gap-2">
          <Button as-child size="sm" class="rounded-lg">
            <RouterLink :to="{ name: 'OptimizationNew' }">
              {{ t('optimizations.prepareConfiguration') }}
            </RouterLink>
          </Button>
          <Button variant="outline" size="sm" class="rounded-lg" @click="login('/optimizations')">
            {{ t('auth.signIn') }}
          </Button>
        </div>
      </div>
    </div>

    <FloatingButton :to="{ name: 'OptimizationNew' }" />
  </GridLayout>
</template>