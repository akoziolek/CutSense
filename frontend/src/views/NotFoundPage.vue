<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import ErrorState from '@/components/common/ErrorState.vue'
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex items-center justify-center">
      <ErrorState
        :code="$t('common.errors.notFoundCode')"
        :title="$t('common.errors.notFound')"
        :message="$t('common.errors.notFoundMessage')"
        :back-label="$t('common.actions.backToHome')"
        back-button-class="px-5 font-inter font-medium shadow-sm"
        back-to="/"
      />
    </div>
  </GridLayout>
</template>
