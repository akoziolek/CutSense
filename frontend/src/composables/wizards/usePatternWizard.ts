import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import { usePatternAddingStore } from '@/stores/addingPatternStore'
import { PATTERN_SIZE, PATTERN_VISIBILITY, type PatternFormPayload } from '@/types/pattern'
import { toImageMm } from '@/utils/geometry'
import type { Point2D } from '@/types/geometry'
import { toast } from 'vue-sonner'

interface ShapeAnalysisResponse {
  shapes: Point2D[][]
  imageWidth: number
  imageHeight: number
}

const isPatternSize = (value: string | undefined): value is PATTERN_SIZE =>
  value !== undefined && Object.values(PATTERN_SIZE).some((size) => size === value)

const isPatternVisibility = (value: string | undefined): value is PATTERN_VISIBILITY =>
  value !== undefined &&
  Object.values(PATTERN_VISIBILITY).some((visibility) => visibility === value)

export function usePatternBoundaryAnalysis() {
  const { t } = useI18n()
  const patternStore = usePatternAddingStore()

  const analyzePhotoBoundary = async (
    photoIndex: number,
    onAnalyzed?: (photoIndex: number) => void,
  ): Promise<string | null> => {
    const file = patternStore.photos[photoIndex]
    if (!file) return null

    const photoConfig = patternStore.photoConfigs[photoIndex]
    if (photoConfig?.isAnalyzed || photoConfig?.isAnalyzing) return null

    patternStore.setPhotoAnalyzing(photoIndex, true)

    try {
      const formData = new FormData()
      formData.append('picture', file)

      const result = await api<ShapeAnalysisResponse>('/patterns/analyze-boundary', {
        method: 'POST',
        body: formData,
      })

      if (
        !result.shapes ||
        result.shapes.length === 0 ||
        !result.shapes[0] ||
        result.shapes[0].length < 3 ||
        !Number.isFinite(result.imageWidth) ||
        result.imageWidth <= 0 ||
        !Number.isFinite(result.imageHeight) ||
        result.imageHeight <= 0
      ) {
        throw new Error('Invalid boundary returned.')
      }

      await patternStore.updatePhotoDimensions(photoIndex, result.imageWidth, result.imageHeight)
      patternStore.setPhotoShapes(photoIndex, result.shapes)
      onAnalyzed?.(photoIndex)
      return null
    } catch (error) {
      console.error(`Failed to analyze photo #${photoIndex + 1}:`, error)
      patternStore.setPhotoAnalyzing(photoIndex, false)
      return error instanceof ApiError ? error.body.message : t('patterns.analysisFailed')
    }
  }

  const analyzeAllPhotos = (options?: {
    onPhotoAnalyzed?: (photoIndex: number) => void
    onPhotoError?: (photoIndex: number, message: string) => void
  }) => {
    if (!patternStore.isHydrated) return
    patternStore.photos.forEach((_, idx) => {
      void analyzePhotoBoundary(idx, options?.onPhotoAnalyzed).then((err) => {
        if (err) options?.onPhotoError?.(idx, err)
      })
    })
  }

  return { analyzePhotoBoundary, analyzeAllPhotos }
}

export function useCreatePattern() {
  const { t } = useI18n()
  const patternStore = usePatternAddingStore()

  const isSubmitting = ref(false)
  const submitError = ref('')

  const createPattern = async (payload: PatternFormPayload): Promise<number | null> => {
    if (isSubmitting.value) return null
    submitError.value = ''

    if (!isPatternSize(payload.size)) {
      submitError.value = t('patterns.submitSizeError')
      return null
    }
    if (!isPatternVisibility(payload.visibility)) {
      submitError.value = t('patterns.submitVisibilityError')
      return null
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
      return null
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
      return null
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

      toast.success(t('patterns.savedToast'))
      await patternStore.resetWizard()
      return createdPattern.id
    } catch (error) {
      console.error('Failed to create pattern:', error)
      toast.error(t('patterns.saveErrorToast'))
      submitError.value = error instanceof ApiError ? error.body.message : t('patterns.saveError')
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, submitError, createPattern }
}
