<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { CheckCircle2, AlertCircle, Sparkles, Circle, Loader2 } from 'lucide-vue-next'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'
import { api } from '@/api/client'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'

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
const isChecking = ref(false)
const isAvailable = ref(false)
const availabilityError = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

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

const runAvailabilityCheck = (val: string) => {
  const clean = val.trim()

  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortController) abortController.abort()

  availabilityError.value = ''
  isAvailable.value = false

  if (!clean || !NICKNAME_REGEX.test(clean) || clean === props.currentNickname?.trim()) {
    isChecking.value = false
    return
  }

  isChecking.value = true

  debounceTimer = setTimeout(async () => {
    abortController = new AbortController()
    try {
      const res = await api<{ available: boolean }>(
        `/users/check-nickname?nickname=${encodeURIComponent(clean)}`,
        { signal: abortController.signal },
      )

      if (res.available) {
        isAvailable.value = true
      } else {
        availabilityError.value = t('auth.nicknameTaken')
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        return
      }
      availabilityError.value = t('auth.nicknameCheckFailed')
    } finally {
      isChecking.value = false
    }
  }, 350)
}

watch(nickname, (val) => {
  emit('update:modelValue', val)
  emit('typing')
  runAvailabilityCheck(val)
})

watch(
  () => props.currentNickname,
  () => {
    runAvailabilityCheck(nickname.value)
  },
  { immediate: true },
)


onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (abortController) abortController.abort()
})

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
