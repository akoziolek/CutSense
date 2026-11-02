<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Puzzle, RotateCcw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorState from '@/components/common/ErrorState.vue'
import SelectableOptionCard from '@/components/common/SelectableOptionCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import { api, ApiError } from '@/api/client'
import type { OptimizationAlgorithm, PreparedOptimizerInput } from '@/types/optimization'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const store = useOptimizationAddingStore()

const algorithms = ref<OptimizationAlgorithm[]>([])
const isLoading = ref(true)
const error = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const load = async () => {
  isLoading.value = true
  error.value = ''
  try {
    algorithms.value = await api<OptimizationAlgorithm[]>('/optimizations/algorithms')
    if (algorithms.value.length === 0) {
      error.value = 'No nesting algorithms are available right now.'
      return
    }
    // single algorithm fir now
    if (store.algorithmId === null && algorithms.value.length === 1) {
      store.selectAlgorithm(algorithms.value[0]!.id)
    }
  } catch (e) {
    error.value =
      e instanceof ApiError ? e.body.message : 'Could not load algorithms. Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const handleSubmit = async () => {
  if (isSubmitting.value) return
  const payload = store.toPayload()
  if (!payload || !store.canSubmit) {
    submitError.value = 'The configuration is incomplete. Check the highlighted fields.'
    return
  }

  submitError.value = ''
  isSubmitting.value = true
  try {
    const prepared = await api<PreparedOptimizerInput>('/optimizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    toast.success(
      `Prepared ${prepared.pieces.length} piece settings. Optimizer integration is not connected yet.`,
    )
  } catch (e) {
    submitError.value =
      e instanceof ApiError
        ? e.body.message
        : 'Could not prepare the optimization configuration. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 pb-14">
    <div
      v-if="isLoading"
      class="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3"
      role="status"
    >
      <Skeleton v-for="n in 3" :key="n" class="h-56 w-full rounded-xl" />
    </div>

    <ErrorState v-else-if="error" title="Unable to load algorithms" :message="error" code="Error">
      <template #actions>
        <Button variant="outline" class="rounded-lg gap-2" @click="load">
          <RotateCcw class="w-4 h-4" />
          <span>Try again</span>
        </Button>
      </template>
    </ErrorState>

    <div
      v-else
      class="mx-auto grid w-full grid-cols-1 gap-6"
      :class="algorithms.length === 1 ? 'max-w-4xl' : 'max-w-4xl sm:grid-cols-3'"
    >
      <SelectableOptionCard
        v-for="algorithm in algorithms"
        :key="algorithm.id"
        :title="algorithm.name"
        :description="algorithm.description"
        :selected="store.algorithmId === algorithm.id"
        @select="store.selectAlgorithm(algorithm.id)"
      >
        <template #icon><Puzzle class="size-8" /></template>
      </SelectableOptionCard>
    </div>

    <p v-if="submitError" class="text-sm font-semibold text-destructive" role="alert">
      {{ submitError }}
    </p>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Prepare configuration"
      :disabled="isLoading || !!error || isSubmitting || store.algorithmId === null || !store.canSubmit"
      @cancel="emit('cancel')"
      @next="handleSubmit"
    />
  </div>
</template>
