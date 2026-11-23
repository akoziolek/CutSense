<script setup lang="ts">
import { onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDownWideNarrow, RotateCw, Sparkles } from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/common/ErrorState.vue'
import SelectableOptionCard from '@/components/common/SelectableOptionCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import type { OptimizationAlgorithm } from '@/types/optimization'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import { useRunOptimization } from '@/composables/wizards/useOptimizationWizard'
import { useI18n } from 'vue-i18n'
import { localizedText } from '@/utils/localizedText'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const router = useRouter()
const { locale } = useI18n()
const store = useOptimizationAddingStore()
const {
  algorithms,
  isLoading,
  error,
  isSubmitting,
  submitError,
  loadAlgorithms: load,
  runOptimization,
} = useRunOptimization()

const getAlgorithmIcon = (algorithm: OptimizationAlgorithm): Component => {
  if (algorithm.id === 1) return ArrowDownWideNarrow
  if (algorithm.id === 2) return RotateCw
  return Sparkles
}

onMounted(load)

const handleSubmit = async () => {
  const runId = await runOptimization()
  if (runId !== null) {
    await router.push({ name: 'OptimizationRun', params: { runId } })
  }
}
</script>

<template>
  <div class="space-y-6 pb-14">
    <div
      v-if="isLoading"
      class="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3 justify-items-center"
      role="status"
    >
      <Skeleton v-for="n in 3" :key="n" class="h-56 w-full rounded-xl" />
    </div>

    <ErrorState
      v-else-if="error"
      :title="$t('optimizations.unableToLoadAlgorithms')"
      :message="error"
      :code="$t('common.errors.errorCode')"
      :retry-label="$t('common.actions.tryAgain')"
      @retry="load"
    />

    <div
      v-else
      class="mx-auto grid w-full grid-cols-1 items-stretch gap-6 pb-14 sm:mt-14"
      :class="{
        'max-w-xl': algorithms.length === 1,
        'max-w-3xl sm:grid-cols-2': algorithms.length === 2,
        'max-w-5xl sm:grid-cols-3': algorithms.length >= 3,
      }"
    >
      <SelectableOptionCard
        v-for="algorithm in algorithms"
        :key="algorithm.id"
        class="h-full w-full"
        :title="localizedText(algorithm.name, locale)"
        :description="algorithm.description ? localizedText(algorithm.description, locale) : undefined"
        :selected="store.algorithmId === algorithm.id"
        @select="store.selectAlgorithm(algorithm.id)"
      >
        <template #icon>
          <component :is="getAlgorithmIcon(algorithm)" class="size-8" />
        </template>
      </SelectableOptionCard>
    </div>

    <p v-if="submitError" class="text-sm font-semibold text-destructive text-center" role="alert">
      {{ submitError }}
    </p>

    <FormFloatingActions
      :cancel-label="$t('common.actions.cancel')"
      :next-label="$t('optimizations.prepareConfiguration')"
      :disabled="
        isLoading || !!error || isSubmitting || store.algorithmId === null || !store.canSubmit
      "
      @cancel="emit('cancel')"
      @next="handleSubmit"
    />
  </div>
</template>
