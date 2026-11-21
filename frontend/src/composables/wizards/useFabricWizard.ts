import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { toPostgisBoundary } from '@/utils/geometry'
import type { FabricFormPayload } from '@/types/fabric'
import type { Point2D } from '@/types/geometry'

interface ShapeAnalysisResponse {
  shapes: Point2D[][]
  imageWidth: number
  imageHeight: number
}

export function useFabricBoundaryAnalysis() {
  const { t } = useI18n()
  const fabricStore = useFabricAddingStore()

  const isAnalyzing = ref(false)
  const analysisError = ref('')

  const analyzeBoundary = async (picture: File): Promise<Point2D[] | null> => {
    isAnalyzing.value = true
    analysisError.value = ''
    try {
      const formData = new FormData()
      formData.append('picture', picture)

      const result = await api<ShapeAnalysisResponse>('/fabrics/analyze-boundary', {
        method: 'POST',
        body: formData,
      })

      const [shape] = result.shapes
      if (
        result.imageWidth <= 0 ||
        result.imageHeight <= 0 ||
        result.shapes.length !== 1 ||
        !shape ||
        shape.length < 3
      ) {
        throw new Error('Shape analysis returned an invalid boundary.')
      }

      await fabricStore.updateConfig({ shapes: result.shapes })
      return shape
    } catch (error) {
      console.error('Failed to analyze fabric photo:', error)
      analysisError.value =
        error instanceof ApiError ? error.body.message : t('fabrics.analysisFailed')
      return null
    } finally {
      isAnalyzing.value = false
    }
  }

  return { isAnalyzing, analysisError, analyzeBoundary }
}

export function useCreateFabric() {
  const { t } = useI18n()
  const fabricStore = useFabricAddingStore()

  const isSubmitting = ref(false)
  const submitError = ref('')

  const createFabric = async (payload: FabricFormPayload): Promise<number | null> => {
    submitError.value = ''
    if (isSubmitting.value) return null

    const { file, config } = fabricStore
    if (!file || !fabricStore.isShapeConfigured) {
      submitError.value = t('fabrics.missingPhotoConfiguration')
      return null
    }

    await fabricStore.updateDetails({
      name: payload.name,
      description: payload.description,
      tags: payload.tags,
    })

    const boundary = toPostgisBoundary(config.shapes[0] ?? [], config)
    const imageWidthMm = Math.round(config.imageWidth / config.pxPerMm)
    const imageHeightMm = Math.round(config.imageHeight / config.pxPerMm)

    const formData = new FormData()
    formData.append('picture', file)
    formData.append('name', payload.name)
    if (payload.description) {
      formData.append('description', payload.description)
    }
    formData.append('boundary', JSON.stringify(boundary))
    formData.append('imageWidthMm', String(imageWidthMm))
    formData.append('imageHeightMm', String(imageHeightMm))
    formData.append('grainline', String(config.threadAngle))
    formData.append('tagIds', JSON.stringify(payload.tags.map((tag) => tag.id)))

    isSubmitting.value = true
    try {
      const createdFabric = await api<{ id: number }>('/fabrics', {
        method: 'POST',
        body: formData,
      })
      await fabricStore.resetWizard()
      return createdFabric.id
    } catch (error) {
      console.error('Failed to create fabric:', error)
      submitError.value = error instanceof ApiError ? error.body.message : t('fabrics.saveError')
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, submitError, createFabric }
}
