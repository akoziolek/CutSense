<script setup lang="ts">
import { watch } from 'vue'
import { toast } from 'vue-sonner'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps<{
  confirmOpen: boolean
  successOpen: boolean
  isDeleting: boolean
  error: string
  title: string
  description: string
  successTitle: string
  successDescription: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'closeSuccess'): void
}>()

const handleCancel = () => {
  if (!props.isDeleting) emit('cancel')
}

const handleOpenChange = (open: boolean) => {
  if (!open) handleCancel()
}

watch(
  () => props.successOpen,
  (open) => {
    if (!open) return
    toast.success(props.successTitle, {
      description: props.successDescription,
    })
    emit('closeSuccess')
  },
  { immediate: true },
)
</script>

<template>
  <BaseModal
    :open="confirmOpen"
    :title="title"
    :description="description"
    :confirm-label="$t('common.actions.delete')"
    :confirm-loading="isDeleting"
    confirm-variant="destructive"
    show-cancel
    focus-confirm
    @confirm="emit('confirm')"
    @cancel="handleCancel"
    @update:open="handleOpenChange"
  >
    <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">{{ error }}</p>
  </BaseModal>
</template>
