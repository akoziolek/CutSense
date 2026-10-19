<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, CheckCircle2, AlertCircle, Sparkles, Circle } from 'lucide-vue-next'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
import { Input } from '@/components/ui/input'
import BaseModal from '@/components/common/BaseModal.vue'

const props = withDefaults(
  defineProps<{ open?: boolean; userName?: string; error?: string; loading?: boolean }>(),
  { open: true, userName: '', error: '', loading: false },
)

const emit = defineEmits<{
  (e: 'save', nickname: string): void
  (e: 'cancel'): void
  (e: 'typing'): void
}>()

const NICKNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/

const nickname = ref('')

const formatError = computed(() => {
  const value = nickname.value.trim()
  return value && !NICKNAME_REGEX.test(value)
    ? 'Nickname must have 3–20 characters: letters, numbers and _ . -'
    : ''
})

const errorMessage = computed(() => props.error || formatError.value)

const status = computed<'idle' | 'valid' | 'error'>(() => {
  if (errorMessage.value) return 'error'
  return nickname.value.trim() ? 'valid' : 'idle'
})

watch(nickname, () => emit('typing'))

const generateRandomNickname = () => {
  let candidate = ''
  do {
    candidate = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: '_',
      style: 'capital',
    })
  } while (candidate.length > 20)
  nickname.value = candidate
}

const handleSave = () => {
  if (status.value === 'valid' && !props.loading) {
    emit('save', nickname.value.trim())
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    description="Choose a unique nickname to get started."
    confirm-label="Save"
    cancel-label="Cancel"
    show-cancel
    prevent-close
    :confirm-disabled="status !== 'valid' || loading"
    :confirm-loading="loading"
    @confirm="handleSave"
    @cancel="emit('cancel')"
  >
    <template #title>
      Welcome, <span class="italic">{{ props.userName }}</span
      >!
    </template>

    <template #confirm-icon>
      <Check class="w-3.5 h-3.5 stroke-[2.5]" />
    </template>

    <div class="space-y-2">
      <div class="relative flex items-center">
        <div class="absolute left-3.5 flex items-center pointer-events-none">
          <Circle v-if="status === 'idle'" class="w-4 h-4 sm:w-5 sm:h-5 text-input fill-muted" />
          <CheckCircle2
            v-else-if="status === 'valid'"
            class="w-4 h-4 sm:w-5 sm:h-5 text-brand-green-foreground fill-brand-green stroke-[2.2]"
          />
          <AlertCircle
            v-else-if="status === 'error'"
            class="w-4 h-4 sm:w-5 sm:h-5 text-destructive stroke-[2.2]"
          />
        </div>

        <Input
          v-model="nickname"
          @keyup.enter="handleSave"
          type="text"
          placeholder="e.g. alex_k"
          :class="[
            'h-11 pl-10 pr-10 text-sm font-medium rounded-xl border transition-colors focus-visible:ring-1 focus-visible:ring-offset-0',
            status === 'error'
              ? 'border-destructive/80 text-foreground focus-visible:border-destructive focus-visible:ring-destructive'
              : status === 'valid'
                ? 'border-brand-green-foreground/80 focus-visible:border-brand-green-foreground focus-visible:ring-brand-green-foreground'
                : 'border-border/80 placeholder:text-input focus-visible:border-border focus-visible:ring-border',
          ]"
        />

        <button
          type="button"
          @click="generateRandomNickname"
          title="Generate nickname"
          class="absolute right-3 p-2 rounded-md text-input hover:text-border hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <Sparkles class="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <p
        v-if="status === 'error'"
        class="text-xs font-semibold text-destructive text-left pl-1"
        role="alert"
      >
        {{ errorMessage }}
      </p>
    </div>
  </BaseModal>
</template>
