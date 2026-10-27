<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import { Skeleton } from '@/components/ui/skeleton'

import StepUpload from '@/components/patterns/new/StepUpload.vue'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import { useNewPatternFormGuard } from '@/composables/patterns/useNewPatternFormGuard'
import DiscardChangesModal from '@/components/forms/DiscardChangesModal.vue'

const TITLES = ['Pattern source', 'Pattern configuration', 'Detected pieces', 'Pattern details']

const route = useRoute()
const router = useRouter()
const patternStore = usePatternAddingStore()
const isInitializing = ref(true)

const { isCancelModalOpen, handleCancel, confirmExit } = useNewPatternFormGuard()

onMounted(async () => {
  if (!patternStore.isHydrated) {
    await patternStore.initFromIndexedDB()
  }
  isInitializing.value = false
})

const validStep = computed(() => {
  if (isInitializing.value) return 1
  const requestedStep = Number(route.query.step) || 1

  if (requestedStep >= 2 && !patternStore.hasPhotos) {
    return 1
  }

  return Math.min(Math.max(requestedStep, 1), 4)
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
</script>

<template>
  <GridLayout>
    <div class="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-12 sm:py-10 lg:px-14">
      <div v-if="isInitializing" class="space-y-4">
        <Skeleton class="h-10 w-64" />
        <Skeleton class="h-96 w-full rounded-2xl" />
      </div>

      <template v-else>
        <PageHeader :title="TITLES[step - 1]" :show-back="step > 1" @back="step = step - 1">
          <template #actions>
            <StepCounter :current-step="step" :total-steps="4" />
          </template>
        </PageHeader>

        <StepUpload v-if="step === 1" @next="step = 2" @cancel="handleCancel" />

        <div v-else class="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
          Step {{ step }} placeholder
        </div>
      </template>
    </div>

    <DiscardChangesModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>
