<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import { Button } from '@/components/ui/button'

defineProps<{
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
</script>

<template>
  <BaseModal
    :open="confirmOpen"
    :title="title"
    :description="description"
    @update:open="(open: boolean) => { if (!open && !isDeleting) emit('cancel') }"
  >
    <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">{{ error }}</p>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          class="h-9 rounded-lg text-xs sm:text-sm font-semibold border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
          :disabled="isDeleting"
          @click="emit('cancel')"
        >
          Cancel
        </Button>
        <Button
          type="button"
          class="h-9 rounded-lg px-4 text-xs sm:text-sm font-semibold font-inter bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
          :disabled="isDeleting"
          @click="emit('confirm')"
        >
          Delete
        </Button>
      </div>
    </template>
  </BaseModal>

  <BaseModal
    :open="successOpen"
    :title="successTitle"
    :description="successDescription"
    confirm-label="Got it"
    prevent-close
    @confirm="emit('closeSuccess')"
  />
</template>