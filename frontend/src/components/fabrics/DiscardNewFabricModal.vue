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
    title="Discard changes?"
    description="Are you sure you want to exit? All progress will be lost."
    confirm-label="Yes, discard"
    cancel-label="Continue editing"
    show-cancel
    @confirm="emit('confirm')"
    @cancel="isOpen = false"
  />
</template>