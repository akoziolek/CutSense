<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import StepFabricSource from '@/components/optimizations/new/StepFabricSource.vue'
import StepCustomDimensions from '@/components/optimizations/new/StepCustomDimensions.vue'
import StepFabricLibrary from '@/components/optimizations/new/StepFabricLibrary.vue'
import StepPatternLibrary from '@/components/optimizations/new/StepPatternLibrary.vue'
import StepAlgorithm from '@/components/optimizations/new/StepAlgorithm.vue'
import StepElements from '@/components/optimizations/new/StepElements.vue'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

const TOTAL_STEPS = 5

const route = useRoute()
const router = useRouter()
const store = useOptimizationAddingStore()

const { isCancelModalOpen, handleCancel, confirmExit } = useUnsavedChangesGuard({
  isDirty: computed(() => store.isDirty),
  defaultTarget: '/optimizations',
  onConfirmExit: store.reset,
})

const maxStep = computed(() => {
  if (!store.fabricSource) return 1
  if (!store.isFabricConfigured) return 2
  if (!store.pattern) return 3
  return store.canSubmit ? 5 : 4
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

const title = computed(() => {
  switch (step.value) {
    case 1:
      return 'Fabric source'
    case 2:
      return store.fabricSource === 'custom' ? 'Custom dimensions' : 'Fabric library'
    case 3:
      return 'Pattern library'
    case 4:
      return 'Optimization elements'
    default:
      return 'Nesting strategy'
  }
})
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader :title="title" :show-back="step > 1" @back="step = step - 1">
        <template #actions>
          <StepCounter :current-step="step" :total-steps="TOTAL_STEPS" />
        </template>
      </PageHeader>

      <StepFabricSource v-if="step === 1" @next="step = 2" @cancel="handleCancel" />

      <template v-else-if="step === 2">
        <StepCustomDimensions
          v-if="store.fabricSource === 'custom'"
          @next="step = 3"
          @cancel="handleCancel"
        />
        <StepFabricLibrary v-else @next="step = 3" @cancel="handleCancel" />
      </template>

      <StepPatternLibrary v-else-if="step === 3" @next="step = 4" @cancel="handleCancel" />
      <StepElements v-else-if="step === 4" @next="step = 5" @cancel="handleCancel" />
      <StepAlgorithm v-else @cancel="handleCancel" />
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>
