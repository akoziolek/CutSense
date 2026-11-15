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
        :code="$t('common.errors.notFoundCode')"
        :title="$t('common.errors.notFound')"
        :message="$t('common.errors.notFoundMessage')"
      >
        <template #actions>
          <Button
            as-child
            variant="default"
            class="rounded-lg px-5 font-inter font-medium shadow-sm"
          >
            <RouterLink to="/" class="inline-flex items-center gap-2">
              <ArrowLeft class="w-4 h-4" />
              <span>{{ $t('common.actions.backToHome') }}</span>
            </RouterLink>
          </Button>
        </template>
      </ErrorState>
    </div>
  </GridLayout>
</template>
