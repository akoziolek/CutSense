<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PatternForm from '@/components/patterns/PatternForm.vue'
import { PATTERN_VISIBILITY, type PatternFormPayload } from '@/types/pattern'
import { useUnsavedChangesGuard } from '@/composables/forms/useUnsavedChangesGuard'
import { useFormDraft } from '@/composables/forms/useFormDraft'
import { usePatternEdit } from '@/composables/patterns/usePatternEdit'

const route = useRoute()
const { t } = useI18n()

const patternId = computed(() => Number(route.params.id))
const DRAFT_KEY = computed(() => `pattern_edit_draft_${patternId.value}`)

const draftData = ref<Partial<PatternFormPayload>>({})
const { isDirty, loadDraft, saveDraft, clearDraft } = useFormDraft<PatternFormPayload>(DRAFT_KEY)

const detailsRoute = computed(() => ({ name: 'PatternDetails', params: { id: patternId.value } }))
const { isCancelModalOpen, handleCancel, confirmExit, resetGuard } = useUnsavedChangesGuard({
  isDirty,
  defaultTarget: detailsRoute,
})

const {
  isFetching,
  showSkeleton,
  error,
  isSubmitting,
  submitError,
  clearSkeletonTimer,
  fetchPattern: loadPattern,
  updatePattern,
} = usePatternEdit()

const fetchPattern = async (id: number, activeSignal = { active: true }) => {
  const result = await loadPattern(id, activeSignal)
  if (result && activeSignal.active) {
    const savedDraft = loadDraft()
    draftData.value = savedDraft ?? {
      name: result.name,
      size: result.size,
      description: result.description ?? '',
      tags: result.tags ?? [],
      visibility: result.visibility ?? PATTERN_VISIBILITY.PRIVATE,
    }
  }
}

const handleFormChange = (payload: Partial<PatternFormPayload>) => {
  if (isCancelModalOpen.value) return
  draftData.value = payload
  saveDraft(payload)
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

const handleSubmit = async (payload: PatternFormPayload) => {
  const ok = await updatePattern(patternId.value, payload)
  if (ok) {
    clearDraft()
    confirmExit()
  }
}

watch(
  () => patternId.value,
  (id, _, onCleanup) => {
    if (!id || Number.isNaN(id)) return
    resetGuard()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    void fetchPattern(id, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="t('patterns.edit')" />
      <Transition
        mode="out-in"
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <main v-if="error" key="error">
          <ErrorState
            :title="t('patterns.unableToLoad')"
            :message="error"
            :code="t('common.errors.errorCode')"
            :retry-label="t('common.actions.tryAgain')"
            :back-label="t('common.actions.backToPatterns')"
            back-to="/patterns"
            @retry="fetchPattern(patternId)"
          />
        </main>

        <main v-else key="content">
          <div class="max-w-3xl bg-background rounded-2xl px-4 py-2 space-y-6">
            <PatternForm
              :name="draftData.name"
              :size="draftData.size"
              :description="draftData.description"
              :tags="draftData.tags"
              :visibility="draftData.visibility"
              :is-loading="showSkeleton || isFetching"
              :is-submitting="isSubmitting"
              :submit-error="submitError"
              @cancel="handleCancel"
              @change="handleFormChange"
              @submit="handleSubmit"
            />
          </div>
        </main>
      </Transition>
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="handleConfirmExit" />
  </GridLayout>
</template>
