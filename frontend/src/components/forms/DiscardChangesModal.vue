<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  (e: 'confirm'): void
}>()
</script>

<template>
  <BaseModal
    v-model:open="isOpen"
    :title="$t('common.discard.title')"
    :description="$t('common.discard.description')"
    :confirm-label="$t('common.actions.yesDiscard')"
    :cancel-label="$t('common.actions.continueEditing')"
    show-cancel
    @confirm="emit('confirm')"
    @cancel="isOpen = false"
  />
</template>