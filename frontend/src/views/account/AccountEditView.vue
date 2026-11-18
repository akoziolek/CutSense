<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import NicknameInput from '@/components/auth/NicknameInput.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { useAuth } from '@/composables/useAuth'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import { useFormDraft } from '@/composables/useFormDraft'
import { api, ApiError } from '@/api/client'

interface AccountDraft {
  nickname: string
}

const { t } = useI18n()
const { state: auth, loadUser } = useAuth()

const DRAFT_KEY = computed(() =>
  auth.user?.id ? `account_edit_draft_${auth.user.id}` : 'account_edit_draft',
)

const { isDirty, loadDraft, saveDraft, clearDraft } = useFormDraft<AccountDraft>(DRAFT_KEY)

const nickname = ref('')
const isNicknameValid = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

const currentNickname = computed(() => auth.user?.nickname ?? '')

const { isCancelModalOpen, handleCancel, confirmExit } = useUnsavedChangesGuard({
  isDirty,
  defaultTarget: '/account',
})

onMounted(() => {
  void loadUser()
})

watch(
  () => auth.loaded,
  (loaded) => {
    if (!loaded) return
    const savedDraft = loadDraft()
    nickname.value = savedDraft?.nickname ?? currentNickname.value
  },
  { immediate: true },
)

const handleNicknameChange = (value: string) => {
  if (!auth.loaded || isCancelModalOpen.value) return

  if (value.trim() === currentNickname.value) {
    clearDraft()
  } else {
    saveDraft({ nickname: value })
  }
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

const handleSubmit = async () => {
  if (!isNicknameValid.value || !isDirty.value || isSubmitting.value) return

  const cleanNickname = nickname.value.trim()
  submitError.value = ''
  isSubmitting.value = true

  try {
    await api(`/users/${auth.user?.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ nickname: cleanNickname }),
    })

    await loadUser(true)
    clearDraft()
    confirmExit()
  } catch (e) {
    console.error('Failed to update account:', e)
    submitError.value = e instanceof ApiError ? e.body.message : t('account.updateFailed')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="t('account.edit')" />

      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <main v-if="!auth.loaded" key="skeleton">
          <div class="max-w-2xl bg-background rounded-2xl px-4 py-2 space-y-6">
            <div v-for="i in 2" :key="i" class="space-y-2">
              <div class="h-5 w-24 rounded bg-muted animate-pulse" />
              <div class="h-10 w-full max-w-md rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </main>

        <main v-else key="content">
          <form
            class="max-w-2xl bg-background rounded-2xl px-4 py-2 space-y-6"
            @submit.prevent="handleSubmit"
          >
            <div class="space-y-1">
              <label
                class="block font-semibold font-inter text-base text-foreground tracking-tight"
              >
                {{ t('account.email') }}
              </label>
              <p class="text-sm text-muted-foreground break-all">
                {{ auth.user?.email || '—' }}
              </p>
            </div>

            <div class="space-y-2">
              <label
                class="block font-semibold font-inter text-base text-foreground tracking-tight"
              >
                {{ t('account.nickname') }}
              </label>
              <NicknameInput
                v-model="nickname"
                v-model:valid="isNicknameValid"
                :current-nickname="currentNickname"
                :error="submitError"
                :disabled="isSubmitting"
                @update:model-value="handleNicknameChange"
                @typing="submitError = ''"
              />
            </div>

            <FormFloatingActions
              :cancel-label="t('common.actions.cancel')"
              :next-label="t('common.actions.save')"
              :disabled="!isNicknameValid || !isDirty || isSubmitting"
              @cancel="handleCancel"
              @next="handleSubmit"
            />
          </form>
        </main>
      </Transition>
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="handleConfirmExit" />
  </GridLayout>
</template>