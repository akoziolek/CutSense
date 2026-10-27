<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps<{
  open: boolean
  error?: string
  registrationCancelled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'login'): void
}>()
</script>

<template>
  <BaseModal
    :open="open"
    :title="props.registrationCancelled ? 'Registration cancelled' : 'Sign in to continue'"
    :description="
      props.registrationCancelled
        ? 'Your account was not created. You can continue browsing or sign in with Google to try again.'
        : 'This page is available only for signed-in users.'
    "
    confirm-label="Continue with Google"
    full-width-button
    @update:open="(v) => emit('update:open', v)"
    @confirm="emit('login')"
  >
    <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">
      {{ error }}
    </p>
  </BaseModal>
</template>
