<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import PatternForm, { type PatternFormPayload } from '@/components/patterns/PatternForm.vue'
import { usePatternAddingStore } from '@/stores/addingPatternStore'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()
const router = useRouter()
const isSubmitting = ref(false)
const submitError = ref('')

const saveDetails = async (payload: Partial<PatternFormPayload>) => {
  const details: Parameters<typeof patternStore.updateDetails>[0] = {
    name: payload.name,
    size: payload.size,
    description: payload.description ?? '',
    tags: payload.tags,
  }
  if (payload.visibility === 'PRIVATE' || payload.visibility === 'PUBLIC') {
    details.visibility = payload.visibility
  }

  try {
    await patternStore.updateDetails(details)
  } catch (error) {
    console.error('Failed to save pattern details draft:', error)
  }
}

const handleSubmit = async (payload: PatternFormPayload) => {
  if (isSubmitting.value) return
  submitError.value = ''

  if (payload.visibility !== 'PRIVATE' && payload.visibility !== 'PUBLIC') {
    submitError.value = 'Select a valid pattern visibility.'
    return
  }

  const pieces = patternStore.pieces.map((piece) => {
    const config = patternStore.photoConfigs[piece.photoIndex]
    const shape = config?.shapes[piece.shapeIndex]

    if (
      !config ||
      !shape ||
      shape.length < 3 ||
      config.imageWidth <= 0 ||
      config.imageHeight <= 0 ||
      config.pxPerMm <= 0
    ) {
      return null
    }

    return {
      points: shape.map(({ pctX, pctY }) => ({
        x: (pctX * config.imageWidth) / 100 / config.pxPerMm,
        y: ((100 - pctY) * config.imageHeight) / 100 / config.pxPerMm,
      })),
      grainline: piece.grainline,
      normal: piece.normal,
      mirrored: piece.mirrored,
    }
  })

  const validPieces = pieces.filter((piece) => piece !== null)
  if (validPieces.length === 0 || validPieces.length !== pieces.length) {
    submitError.value =
      'Pattern piece configuration is incomplete. Return to the previous steps and try again.'
    return
  }

  isSubmitting.value = true
  try {
    await patternStore.updateDetails({
      name: payload.name,
      size: payload.size,
      description: payload.description ?? '',
      tags: payload.tags,
      visibility: payload.visibility,
    })

    const createdPattern = await api<{ id: number }>('/patterns', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        size: payload.size,
        description: payload.description,
        tags: payload.tags.map((tag) => tag.name),
        visibility: payload.visibility,
        pieces: validPieces,
      }),
    })

    await patternStore.resetWizard()
    await router.push({ name: 'PatternDetails', params: { id: createdPattern.id } })
  } catch (error) {
    console.error('Failed to create pattern:', error)
    submitError.value =
      error instanceof ApiError ? error.body.message : 'Could not save pattern. Please try again.'
  } finally {
    isSubmitting.value = false
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
