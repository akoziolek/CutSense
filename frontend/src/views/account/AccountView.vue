<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/common/PageHeader.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import { useAuth } from '@/stores/authStore'
import Button from '@/components/ui/button/Button.vue'
import { Pencil } from 'lucide-vue-next'

const { t } = useI18n()
const { state: auth } = useAuth()
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-8">
      <div class="space-y-1.5">
        <PageHeader :title="t('account.details')">
          <template #actions>
            <Button
              as-child
              variant="ghost"
              size="sm"
              class="border-2 whitespace-nowrap hover:bg-brand-grey! hover:text-foreground"
            >
              <RouterLink to="/account/edit">
                <Pencil class="w-4 h-4 shrink-0" />
                {{ t('common.actions.edit') }}
              </RouterLink>
            </Button>
          </template>
        </PageHeader>
        <p class="text-sm text-muted-foreground ml-4">
          {{ t('account.detailsDescription') }}
        </p>
      </div>
      <div v-if="!auth.loaded" class="max-w-2xl space-y-5 ml-4">
        <div v-for="i in 2" :key="i" class="space-y-1.5">
          <div class="h-5 w-24 rounded bg-muted animate-pulse" />
          <div class="h-4 w-52 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <dl v-else class="max-w-2xl space-y-5 ml-4">
        <div class="space-y-1">
          <dt class="font-semibold font-inter text-base text-foreground tracking-tight">
            {{ t('account.email') }}
          </dt>
          <dd class="text-sm text-muted-foreground break-all">
            {{ auth.user?.email || '—' }}
          </dd>
        </div>

        <div class="space-y-1">
          <dt class="font-semibold font-inter text-base text-foreground tracking-tight">
            {{ t('account.nickname') }}
          </dt>
          <dd class="text-sm text-muted-foreground break-words">
            {{ auth.user?.nickname || '—' }}
          </dd>
        </div>
      </dl>
    </div>
  </GridLayout>
</template>
