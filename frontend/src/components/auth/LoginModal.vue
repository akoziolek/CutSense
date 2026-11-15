<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    :title="t(props.registrationCancelled ? 'auth.registrationCancelled' : 'auth.signIn')"
    :description="
      props.registrationCancelled
        ? t('auth.registrationCancelledDescription')
        : t('auth.signInDescription')
    "
    :confirm-label="t('common.actions.continueWithGoogle')"
    full-width-button
    @update:open="(v) => emit('update:open', v)"
    @confirm="emit('login')"
  >
    <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">
      {{ error }}
    </p>
  </BaseModal>
</template>
