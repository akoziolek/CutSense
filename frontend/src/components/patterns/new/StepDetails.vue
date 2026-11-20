<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import PatternForm from '@/components/patterns/PatternForm.vue'
import {
  PATTERN_SIZE,
  PATTERN_VISIBILITY,
  type PatternDetails,
  type PatternFormPayload,
} from '@/types/pattern'
import { toImageMm } from '@/utils/geometry'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const patternStore = usePatternAddingStore()
const router = useRouter()
const isSubmitting = ref(false)
const submitError = ref('')
const { t } = useI18n()

const isPatternSize = (value: string | undefined): value is PATTERN_SIZE =>
  value !== undefined && Object.values(PATTERN_SIZE).some((size) => size === value)
const isPatternVisibility = (value: string | undefined): value is PATTERN_VISIBILITY =>
  value !== undefined && Object.values(PATTERN_VISIBILITY).some((visibility) => visibility === value)

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
  if (isSubmitting.value) return
  submitError.value = ''

  if (!isPatternSize(payload.size)) {
    submitError.value = t('patterns.submitSizeError')
    return
  }
  if (!isPatternVisibility(payload.visibility)) {
    submitError.value = t('patterns.submitVisibilityError')
    return
  }

  const pieces = patternStore.pieces.map((piece) => {
    const config = patternStore.photoConfigs[piece.photoIndex]
    const shapeIndex = config?.shapeIds.indexOf(piece.shapeId) ?? -1
    const shape = shapeIndex >= 0 ? config?.shapes[shapeIndex] : undefined

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
      imageIndex: piece.photoIndex,
      points: shape.map((point) =>
        toImageMm(point, config.imageWidth, config.imageHeight, config.pxPerMm),
      ),
      grainline: piece.grainline,
      normal: piece.normal,
      mirrored: piece.mirrored,
    }
  })

  const validPieces = pieces.filter((piece) => piece !== null)
  if (validPieces.length === 0 || validPieces.length !== pieces.length) {
    submitError.value = t('patterns.detailsPiecesHelp')
    return
  }

  const imageDimensions = patternStore.photos.map((_, imageIndex) => {
    const config = patternStore.photoConfigs[imageIndex]
    if (
      !config ||
      !Number.isFinite(config.imageWidth) ||
      !Number.isFinite(config.imageHeight) ||
      !Number.isFinite(config.pxPerMm) ||
      config.imageWidth <= 0 ||
      config.imageHeight <= 0 ||
      config.pxPerMm <= 0
    ) {
      return null
    }

    return {
      imageWidthMm: Math.max(1, Math.round(config.imageWidth / config.pxPerMm)),
      imageHeightMm: Math.max(1, Math.round(config.imageHeight / config.pxPerMm)),
    }
  })

  if (imageDimensions.some((dimensions) => dimensions === null)) {
    submitError.value = t('patterns.detailsImageHelp')
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

    const formData = new FormData()
    formData.append('name', payload.name)
    formData.append('size', payload.size)
    formData.append('description', payload.description ?? '')
    formData.append('tags', JSON.stringify(payload.tags.map((tag) => tag.name)))
    formData.append('visibility', payload.visibility)
    formData.append('images', JSON.stringify(imageDimensions))
    formData.append('pieces', JSON.stringify(validPieces))
    patternStore.photos.forEach((photo) => formData.append('photos', photo, photo.name))

    const createdPattern = await api<{ id: number }>('/patterns', {
      method: 'POST',
      body: formData,
    })

    await patternStore.resetWizard()
    await router.push({ name: 'PatternDetails', params: { id: createdPattern.id } })
  } catch (error) {
    console.error('Failed to create pattern:', error)
    submitError.value =
      error instanceof ApiError ? error.body.message : t('patterns.saveError')
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
