<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CheckCircle2, AlertCircle, Sparkles, Circle, Loader2 } from 'lucide-vue-next'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { useNicknameCheck } from '@/composables/auth/useNicknameCheck'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    currentNickname?: string
    error?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    currentNickname: '',
    error: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:valid', valid: boolean): void
  (e: 'typing'): void
}>()

const { t } = useI18n()

const NICKNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/

const nickname = ref(props.modelValue)
const {
  isChecking,
  isAvailable,
  availabilityError,
  check: runAvailabilityCheck,
} = useNicknameCheck(NICKNAME_REGEX)

const formatError = computed(() => {
  const value = nickname.value.trim()
  if (!value) return ''
  return !NICKNAME_REGEX.test(value) ? t('auth.nicknameFormat') : ''
})

const errorMessage = computed(() => {
  return formatError.value || availabilityError.value || props.error
})

const status = computed<'idle' | 'checking' | 'valid' | 'error'>(() => {
  if (!nickname.value.trim()) return 'idle'
  if (formatError.value || availabilityError.value || props.error) return 'error'
  if (isChecking.value) return 'checking'
  if (isAvailable.value) return 'valid'
  return 'idle'
})

const isValid = computed(() => status.value === 'valid')

watch(
  () => props.modelValue,
  (val) => {
    if (val !== nickname.value) {
      nickname.value = val
    }
  },
)

watch(
  isValid,
  (valid) => {
    emit('update:valid', valid)
  },
  { immediate: true },
)

watch(nickname, (val) => {
  emit('update:modelValue', val)
  emit('typing')
  runAvailabilityCheck(val, props.currentNickname)
})

watch(
  () => props.currentNickname,
  (current) => {
    runAvailabilityCheck(nickname.value, current)
  },
  { immediate: true },
)

const generateRandomNickname = () => {
  if (props.disabled) return

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
</script>

<template>
  <div class="space-y-2">
    <div class="relative flex items-center">
      <div class="absolute left-3.5 flex items-center pointer-events-none">
        <Circle v-if="status === 'idle'" class="w-4 h-4 sm:w-5 sm:h-5 text-input fill-muted" />
        <Loader2
          v-else-if="status === 'checking'"
          class="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-muted-foreground"
        />
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
        type="text"
        :disabled="disabled"
        :placeholder="t('auth.nicknamePlaceholder')"
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
        :disabled="disabled"
        :title="t('common.actions.generateNickname')"
        class="absolute right-3 p-2 rounded-md text-input hover:text-border hover:bg-muted/40 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        @click="generateRandomNickname"
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
</template>
