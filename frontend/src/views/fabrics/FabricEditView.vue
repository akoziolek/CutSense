<script setup lang="ts">
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import { useRoute } from 'vue-router'
import { useUnsavedChangesGuard } from '@/composables/forms/useUnsavedChangesGuard'
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FabricForm from '@/components/fabrics/FabricForm.vue'
import type { FabricFormPayload } from '@/types/fabric'
import ErrorState from '@/components/common/ErrorState.vue'
import { useFormDraft } from '@/composables/forms/useFormDraft'
import { useFabricEdit } from '@/composables/fabrics/useFabricEdit'

const route = useRoute()
const { t } = useI18n()
const fabricId = computed(() => Number(route.params.id))
const DRAFT_KEY = computed(() => `fabric_edit_draft_${fabricId.value}`)

const draftData = ref<Partial<FabricFormPayload>>({})
const { isDirty, loadDraft, saveDraft, clearDraft } = useFormDraft<FabricFormPayload>(DRAFT_KEY)

const detailsRoute = computed(() => ({ name: 'FabricDetails', params: { id: fabricId.value } }))

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
  fetchFabric: loadFabric,
  updateFabric,
} = useFabricEdit()

const fetchFabric = async (id: number, activeSignal = { active: true }) => {
  const result = await loadFabric(id, activeSignal)
  if (result && activeSignal.active) {
    const savedDraft = loadDraft()
    draftData.value = savedDraft ?? {
      name: result.name,
      description: result.description ?? '',
      tags: result.tags ?? [],
    }
  }
}

const handleSubmit = async (payload: FabricFormPayload) => {
  const ok = await updateFabric(fabricId.value, payload)
  if (ok) {
    clearDraft()
    confirmExit()
  }
}

const handleFormChange = (payload: Partial<FabricFormPayload>) => {
  if (isCancelModalOpen.value) return
  draftData.value = payload
  saveDraft(payload)
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

watch(
  () => fabricId.value,
  (id, _, onCleanup) => {
    if (!id || Number.isNaN(id)) return
    resetGuard()
    const activeSignal = { active: true }
    onCleanup(() => {
      activeSignal.active = false
      clearSkeletonTimer()
    })
    void fetchFabric(id, activeSignal)
  },
  { immediate: true },
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="t('fabrics.edit')" />
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
            :title="t('fabrics.unableToLoad')"
            :message="error"
            :code="t('common.errors.errorCode')"
            :retry-label="t('common.actions.tryAgain')"
            :back-label="t('common.actions.backToFabrics')"
            back-to="/fabrics"
            @retry="fetchFabric(fabricId)"
          />
        </main>

        <main v-else key="content">
          <div class="max-w-3xl bg-background rounded-2xl px-4 py-2 space-y-6">
            <FabricForm
              :name="draftData.name"
              :description="draftData.description"
              :tags="draftData.tags"
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
