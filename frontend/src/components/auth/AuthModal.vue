<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NickNameModal from '@/components/auth/NickNameModal.vue'
import LoginModal from '@/components/auth/LoginModal.vue'
import { api, ApiError } from '@/api/client'
import { login, useAuth } from '@/composables/useAuth'
import { consumeReturnTo } from '@/utils/returnTo'

const route = useRoute()
const router = useRouter()
const { loadUser, logout } = useAuth()

// ---------- login modal ----------
const authError = computed(() =>
  route.query.error === 'google_auth_failed' ? 'Google sign-in failed. Please try again.' : '',
)
const registrationCancelled = computed(() => route.query.registration_cancelled === '1')
const dismissError = ref('')
const loginError = computed(() => dismissError.value || authError.value)

const googleName = ref('')
const regError = ref('')
const saving = ref(false)

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
      dismissError.value = 'Could not log out. Please try again.'
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
      googleName.value = (await api<{ name: string }>('/auth/registration-session')).name
    } catch {
      router.replace({ name: 'Landing', query: { login: '1' } })
    }
  },
  { immediate: true },
)

async function onSave(nickname: string) {
  saving.value = true
  regError.value = ''
  try {
    await api('/auth/register', { method: 'POST', body: JSON.stringify({ nickname }) })
    await loadUser(true)
    router.replace(consumeReturnTo())
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        router.replace({ name: 'Landing', query: { login: '1' } })
      } else if (e.body.errorCode === 'VALIDATION_ERROR' && Array.isArray(e.body.details)) {
        regError.value = e.body.details.join(' ')
      } else {
        regError.value = e.body.message
      }
    } else {
      regError.value = 'Something went wrong. Please try again.'
    }
  } finally {
    saving.value = false
  }
}

// Abandon registration and show a confirmation without blocking the landing page.
async function onCancel() {
  try {
    clearReturnTo()
    await logout()
    await router.replace({ name: 'Landing', query: { registration_cancelled: '1' } })
  } catch {
    regError.value = 'Could not cancel registration. Please try again.'
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
  <NickNameModal
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
