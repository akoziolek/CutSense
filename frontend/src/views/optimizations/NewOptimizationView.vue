<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import StepPatternLibrary from '@/components/optimizations/new/StepPatternLibrary.vue'
import StepElements from '@/components/optimizations/new/StepElements.vue'
import StepFabrics from '@/components/optimizations/new/StepFabrics.vue'
import StepAlgorithm from '@/components/optimizations/new/StepAlgorithm.vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useUnsavedChangesGuard } from '@/composables/forms/useUnsavedChangesGuard'
import { provideWizardNav } from '@/composables/forms/useWizardNav'

const TOTAL_STEPS = 4

const route = useRoute()
const router = useRouter()
const store = useOptimizationAddingStore()
const { t } = useI18n()

const { isCancelModalOpen, handleCancel, confirmExit } = useUnsavedChangesGuard({
  isDirty: computed(() => store.isDirty),
  defaultTarget: '/optimizations',
  onConfirmExit: store.reset,
})

const maxStep = computed(() => {
  if (!store.pattern) return 1
  if (!store.elementsValid) return 2
  return store.piecesAssigned ? 4 : 3
})

const validStep = computed(() => {
  const requested = Number(route.query.step) || 1
  return Math.min(Math.max(requested, 1), maxStep.value)
})

const step = computed({
  get: () => validStep.value,
  set(nextStep: number) {
    void router.push({ query: { step: nextStep > 1 ? nextStep : undefined } })
  },
})

provideWizardNav({
  canGoBack: computed(() => step.value > 1),
  back: () => {
    step.value = step.value - 1
  },
})

watch(
  [() => route.query.step, validStep],
  () => {
    const requested = Number(route.query.step) || 1
    if (requested !== validStep.value) {
      void router.replace({ query: { step: validStep.value > 1 ? validStep.value : undefined } })
    }
  },
  { immediate: true },
)

const title = computed(
  () =>
    [
      t('optimizations.patternLibrary'),
      t('optimizations.elements'),
      t('common.navigation.fabrics'),
      t('optimizations.strategy'),
    ][step.value - 1],
)
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="title" show-cancel @cancel="handleCancel">
        <template #actions>
          <StepCounter :current-step="step" :total-steps="TOTAL_STEPS" />
        </template>
      </PageHeader>

      <StepPatternLibrary v-if="step === 1" @next="step = 2" @cancel="handleCancel" />
      <StepElements v-else-if="step === 2" @next="step = 3" @cancel="handleCancel" />
      <StepFabrics v-else-if="step === 3" @next="step = 4" @cancel="handleCancel" />
      <StepAlgorithm v-else @cancel="handleCancel" />
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>