<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'
import { Skeleton } from '@/components/ui/skeleton'

import StepUpload from '@/components/fabrics/new/StepUpload.vue'
import StepConfig from '@/components/fabrics/new/StepConfig.vue'
import StepDetails from '@/components/fabrics/new/StepDetails.vue'

import { provideWizardNav } from '@/composables/useWizardNav'

const route = useRoute()
const router = useRouter()
const fabricStore = useFabricAddingStore()
const isInitializing = ref(true)

const { isCancelModalOpen, handleCancel, confirmExit } = useUnsavedChangesGuard({
  isDirty: computed(() => Boolean(fabricStore.file || fabricStore.previewUrl)),
  defaultTarget: '/fabrics',
  onConfirmExit: fabricStore.resetWizard,
})

onMounted(async () => {
  if (!fabricStore.isHydrated) {
    await fabricStore.initFromIndexedDB()
  }
  isInitializing.value = false
})

const validStep = computed(() => {
  if (isInitializing.value) return 1
  const requestedStep = Number(route.query.step) || 1

  if (requestedStep >= 2 && !fabricStore.file) {
    return 1
  }
  if (requestedStep >= 3 && !fabricStore.isShapeConfigured) {
    return 2
  }

  return requestedStep
})

const step = computed({
  get: () => validStep.value,
  set(nextStep: number) {
    void router.push({
      query: {
        ...route.query,
        step: nextStep > 1 ? nextStep : undefined,
      },
    })
  },
})

provideWizardNav({
  canGoBack: computed(() => step.value > 1),
  back: () => { step.value = step.value - 1 },
})

watch(
  [() => route.query.step, validStep, isInitializing],
  () => {
    if (isInitializing.value) return

    const requestedStep = Number(route.query.step) || 1

    if (requestedStep !== validStep.value) {
      void router.replace({
        query: {
          ...route.query,
          step: validStep.value > 1 ? validStep.value : undefined,
        },
      })
    }
  },
  { immediate: true },
)

const { t } = useI18n()
const titles = computed(() => [
  t('fabrics.uploadTitle'),
  t('fabrics.configurationTitle'),
  t('fabrics.detailsTitle'),
])
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <div v-if="isInitializing" class="space-y-4">
        <Skeleton class="h-10 w-64" />
        <Skeleton class="h-96 w-full rounded-2xl" />
      </div>

      <template v-else>
        <PageHeader :title="titles[step - 1]" show-cancel @cancel="handleCancel">
          <template #actions>
            <StepCounter :current-step="step" :total-steps="3" />
          </template>
        </PageHeader>

        <StepUpload v-if="step === 1" @next="step = 2" @cancel="handleCancel" />

        <StepConfig v-else-if="step === 2" @next="step = 3" @cancel="handleCancel" />

        <StepDetails v-else-if="step === 3" @cancel="handleCancel" />
      </template>
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>
