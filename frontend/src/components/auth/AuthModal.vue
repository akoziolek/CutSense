<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import NicknameModal from './NicknameModal.vue'
import LoginModal from '@/components/auth/LoginModal.vue'
import { login, useAuth } from '@/stores/authStore'
import { clearReturnTo, consumeReturnTo } from '@/utils/returnTo'
import { useRegistration } from '@/composables/auth/useRegistration.ts'

const route = useRoute()
const router = useRouter()
const { loadUser, logout } = useAuth()
const { googleName, saving, fetchRegistrationSession, register } = useRegistration()
const { t } = useI18n()

// ---------- login modal ----------
const authError = computed(() =>
  route.query.error === 'google_auth_failed' ? t('auth.googleSignInFailed') : '',
)
const registrationCancelled = computed(() => route.query.registration_cancelled === '1')
const dismissError = ref('')
const loginError = computed(() => dismissError.value || authError.value)

const regError = ref('')

const activeModal = computed<'login' | 'registration' | null>(() => {
  if (route.query.registration === '1') {
    return 'registration'
  }
  if (route.query.login === '1' || registrationCancelled.value || !!authError.value) {
    return 'login'
  }
  return null
})

const registrationOpen = computed(() => activeModal.value === 'registration')

async function closeLogin() {
  if (registrationCancelled.value) {
    try {
      await logout()
    } catch {
      dismissError.value = t('auth.logoutFailed')
      return
    }
  }
  await router.replace({ name: 'Landing' })
}

watch(
  registrationOpen,
  async (open) => {
    if (!open) return
    regError.value = ''
    try {
      await fetchRegistrationSession()
    } catch {
      router.replace({ name: 'Landing', query: { login: '1' } })
    }
  },
  { immediate: true },
)

async function onSave(nickname: string) {
  regError.value = ''
  const result = await register(nickname)

  if (result.ok) {
    await loadUser(true)
    router.replace(consumeReturnTo())
    return
  }

  if (result.unauthorized) {
    router.replace({ name: 'Landing', query: { login: '1' } })
    return
  }

  regError.value = result.message || t('common.errors.somethingWentWrongRetry')
}

// Abandon registration and show a confirmation without blocking the landing page.
async function onCancel() {
  try {
    clearReturnTo()
    await logout()
    await router.replace({ name: 'Landing', query: { registration_cancelled: '1' } })
  } catch {
    regError.value = t('auth.cancelRegistrationFailed')
  }
}
</script>

<template>
  <LoginModal
    v-if="activeModal === 'login'"
    :open="true"
    :error="loginError"
    :registration-cancelled="registrationCancelled"
    @update:open="(v) => !v && closeLogin()"
    @login="login()"
  />
  <NicknameModal
    v-else-if="activeModal === 'registration'"
    :open="true"
    :user-name="googleName"
    :error="regError"
    :loading="saving"
    @typing="regError = ''"
    @save="onSave"
    @cancel="onCancel"
  />
</template>
