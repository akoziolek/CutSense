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
const loginOpen = computed(() => route.query.login === '1' || !!authError.value)
const closeLogin = () => router.replace({ name: 'Landing' })

// ---------- nickname (registration) modal ----------
const registrationOpen = computed(() => route.query.registration === '1')
const googleName = ref('')
const regError = ref('')
const saving = ref(false)

// when the modal opens, check that the registration session (cookie, 15 min) is still valid
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

// abandoning registration: nothing was saved, only the registration cookie is cleared
async function onCancel() {
  await logout().catch(() => {})
  router.replace({ name: 'Landing' })
}
</script>

<template>
  <LoginModal
    :open="loginOpen && !registrationOpen"
    :error="authError"
    @update:open="(v) => !v && closeLogin()"
    @login="login()"
  />
  <NickNameModal
    :open="registrationOpen"
    :user-name="googleName"
    :error="regError"
    :loading="saving"
    @typing="regError = ''"
    @save="onSave"
    @cancel="onCancel"
  />
</template>