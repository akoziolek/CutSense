import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import { useOptimizationAddingStore } from '@/stores/addingOptimizationStore'
import type {
  OptimizationAlgorithm,
  OptimizationDefaults,
  OptimizationView,
  PatternDetails,
  PatternPieceDefaults,
} from '@/types/optimization'
import { mmToCm } from '@/utils/optimizationConfig'

export function useOptimizationSetup() {
  const { t } = useI18n()
  const store = useOptimizationAddingStore()

  const patternPieces = ref<PatternPieceDefaults[]>([])
  const patternDetails = ref<PatternDetails | null>(null)
  const isLoading = ref(true)
  const loadError = ref('')

  const load = async () => {
    const pattern = store.pattern
    if (!pattern) return

    isLoading.value = true
    loadError.value = ''
    try {
      const [details, defaults] = await Promise.all([
        api<PatternDetails>(`/patterns/${pattern.id}`),
        api<OptimizationDefaults>('/optimizations/defaults'),
      ])
      patternPieces.value = details.pieces
      patternDetails.value = details

      if (store.piecesPatternId !== pattern.id) {
        store.initPieces(pattern.id, details.pieces)
      }
      if (store.seamAllowanceCm === '') {
        store.seamAllowanceCm = mmToCm(defaults.seamAllowanceMm)
      }
      if (store.cuttingAllowanceCm === '') {
        store.cuttingAllowanceCm = mmToCm(defaults.cuttingAllowanceMm)
      }
    } catch (e) {
      loadError.value =
        e instanceof ApiError ? e.body.message : t('optimizations.patternLoadFailed')
    } finally {
      isLoading.value = false
    }
  }

  return { patternPieces, patternDetails, isLoading, loadError, load }
}

export function useRunOptimization() {
  const { t } = useI18n()
  const store = useOptimizationAddingStore()

  const algorithms = ref<OptimizationAlgorithm[]>([])
  const isLoading = ref(true)
  const error = ref('')
  const isSubmitting = ref(false)
  const submitError = ref('')

  const loadAlgorithms = async () => {
    isLoading.value = true
    error.value = ''
    try {
      algorithms.value = await api<OptimizationAlgorithm[]>('/optimizations/algorithms')
      if (algorithms.value.length === 0) {
        error.value = t('optimizations.noAlgorithms')
        return
      }
      if (store.algorithmId === null && algorithms.value.length === 1) {
        store.selectAlgorithm(algorithms.value[0]!.id)
      }
    } catch (e) {
      error.value = e instanceof ApiError ? e.body.message : t('optimizations.algorithmsLoadFailed')
    } finally {
      isLoading.value = false
    }
  }

  const runOptimization = async (): Promise<string[] | null> => {
    if (isSubmitting.value) return null
    const payloads = store.toPayloads()
    if (!payloads) {
      submitError.value = t('optimizations.incompleteConfiguration')
      return null
    }

    submitError.value = ''
    isSubmitting.value = true
    const runIds: string[] = []
    try {
      for (const [index, payload] of payloads.entries()) {
        try {
          const view = await api<OptimizationView>('/optimizations/run', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          if (view.runId) runIds.push(view.runId)
        } catch (e) {
          const message =
            e instanceof ApiError ? e.body.message : t('optimizations.prepareFailed')
          submitError.value = payloads.length > 1 ? `Fabric ${index + 1}: ${message}` : message
          return null
        }
      }
      store.markSubmitted()
      return runIds
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    algorithms,
    isLoading,
    error,
    isSubmitting,
    submitError,
    loadAlgorithms,
    runOptimization,
  }
}