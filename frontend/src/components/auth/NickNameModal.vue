<script setup lang="ts">
import { ref } from 'vue'
import { Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/common/BaseModal.vue'
import NicknameInput from './NicknameInput.vue'

const props = withDefaults(
  defineProps<{ open?: boolean; userName?: string; error?: string; loading?: boolean }>(),
  { open: true, userName: '', error: '', loading: false },
)

const emit = defineEmits<{
  (e: 'save', nickname: string): void
  (e: 'cancel'): void
  (e: 'typing'): void
}>()

const { t } = useI18n()

const nickname = ref('')
const isNicknameValid = ref(false)

const handleSave = () => {
  if (isNicknameValid.value && !props.loading) {
    emit('save', nickname.value.trim())
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :description="t('auth.nicknameDescription')"
    :confirm-label="t('common.actions.save')"
    :cancel-label="t('common.actions.cancel')"
    show-cancel
    prevent-close
    :confirm-disabled="!isNicknameValid || loading"
    :confirm-loading="loading"
    @confirm="handleSave"
    @cancel="emit('cancel')"
  >
    <template #title>
      {{ t('auth.welcome', { name: props.userName }) }}
    </template>

    <template #confirm-icon>
      <Check class="w-3.5 h-3.5 stroke-[2.5]" />
    </template>

    <NicknameInput
      v-model="nickname"
      v-model:valid="isNicknameValid"
      :error="error"
      :disabled="loading"
      @typing="emit('typing')"
    />
  </BaseModal>
</template>