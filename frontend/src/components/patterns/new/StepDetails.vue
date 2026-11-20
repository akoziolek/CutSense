<script setup lang="ts">
import { useRouter } from 'vue-router'
import PatternForm from '@/components/patterns/PatternForm.vue'
import {
  PATTERN_SIZE,
  PATTERN_VISIBILITY,
  type PatternDetails,
  type PatternFormPayload,
} from '@/types/pattern'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import { useCreatePattern } from '@/composables/wizards/usePatternWizard'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()
const { isSubmitting, submitError, createPattern } = useCreatePattern()
const router = useRouter()

const isPatternSize = (value: string | undefined): value is PATTERN_SIZE =>
  value !== undefined && Object.values(PATTERN_SIZE).some((size) => size === value)
const isPatternVisibility = (value: string | undefined): value is PATTERN_VISIBILITY =>
  value !== undefined &&
  Object.values(PATTERN_VISIBILITY).some((visibility) => visibility === value)

const saveDetails = async (payload: Partial<PatternFormPayload>) => {
  const details: Partial<PatternDetails> = {
    name: payload.name,
    description: payload.description ?? '',
    tags: payload.tags,
  }
  if (isPatternSize(payload.size)) details.size = payload.size
  if (isPatternVisibility(payload.visibility)) {
    details.visibility = payload.visibility
  }

  try {
    await patternStore.updateDetails(details)
  } catch (error) {
    console.error('Failed to save pattern details draft:', error)
  }
}

const handleSubmit = async (payload: PatternFormPayload) => {
  const createdId = await createPattern(payload)
  if (createdId !== null) {
    await router.push({ name: 'PatternDetails', params: { id: createdId } })
  }
}
</script>

<template>
  <div class="max-w-3xl bg-background rounded-2xl px-8 py-2 space-y-6 mx-auto sm:mx-5">
    <PatternForm
      :name="patternStore.details.name"
      :size="patternStore.details.size"
      :description="patternStore.details.description"
      :tags="patternStore.details.tags"
      :visibility="patternStore.details.visibility"
      :is-submitting="isSubmitting"
      :submit-error="submitError"
      @submit="handleSubmit"
      @cancel="emit('cancel')"
      @change="saveDetails"
    />
  </div>
</template>
