<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/common/BaseModal.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCardDate } from '@/utils/formatCardDate'

const MAX_NAME_LENGTH = 35

const props = defineProps<{ open: boolean; loading?: boolean; error?: string }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', name: string): void
}>()

const { t } = useI18n()
const name = ref('')
const trimmed = computed(() => name.value.trim())

watch(
  () => props.open,
  (open) => {
    if (open) name.value = `Optimization ${formatCardDate(new Date().toISOString())}`
  },
)

const submit = () => {
  if (trimmed.value && !props.loading) emit('save', trimmed.value)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('optimizations.saveTitle', 'Save optimization')"
    :description="t('optimizations.saveDescription', 'Give this result a name to find it later.')"
    :confirm-label="t('optimizations.save', 'Save')"
    :cancel-label="t('common.actions.cancel', 'Cancel')"
    show-cancel
    :prevent-close="loading"
    :confirm-disabled="!trimmed"
    :confirm-loading="loading"
    @update:open="(v) => emit('update:open', v)"
    @confirm="submit"
    @cancel="emit('update:open', false)"
  >
    <div class="space-y-2">
      <Label for="optimization-name" class="text-sm font-semibold font-inter">
        {{ t('optimizations.nameLabel') }}
      </Label>
      <div class="relative">
        <Input
          id="optimization-name"
          v-model="name"
          :maxlength="MAX_NAME_LENGTH"
          class="pr-14"
          @keyup.enter="submit"
        />
        <span
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground"
        >
          {{ name.length }}/{{ MAX_NAME_LENGTH }}
        </span>
      </div>
      <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">{{ error }}</p>
    </div>
  </BaseModal>
</template>