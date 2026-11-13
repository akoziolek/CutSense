<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/common/PageHeader.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'

const { t } = useI18n()

const user = computed(() => ({
  email: 'jan.kowalski@example.com',
  nickname: 'Jan Kowalski',
}))
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-8">
      <div class="space-y-1.5">
        <PageHeader :title="t('account.details')" />
        <p class="text-sm text-muted-foreground ml-4">
          {{ t('account.detailsDescription') }}
        </p>
      </div>

      <dl class="max-w-2xl space-y-5 ml-4">
        <div class="space-y-1">
          <dt class="font-semibold font-inter text-md text-foreground tracking-tight">
            {{ t('account.email') }}
          </dt>
          <dd class="text-sm text-muted-foreground break-all">
            {{ user.email || '—' }}
          </dd>
        </div>

        <div class="space-y-1">
          <dt class="font-semibold font-inter text-md text-foreground tracking-tight">
            {{ t('account.nickname') }}
          </dt>
          <dd class="text-sm text-muted-foreground break-words">
            {{ user.nickname || '—' }}
          </dd>
        </div>
      </dl>
    </div>
  </GridLayout>
</template>
