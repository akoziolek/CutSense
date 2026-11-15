import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CreateOptimizationPayload,
  FabricSource,
  OptimizationPieceConfig,
  PatternPieceDefaults,
  SelectedItem,
} from '@/types/optimization'
import {
  MAX_CUTTING_ALLOWANCE_CM,
  MAX_SEAM_ALLOWANCE_CM,
  cmToMm,
  isValidAllowanceCm,
  isValidFabricSideCm,
  parseCm,
} from '@/utils/optimizationConfig'

let pieceSeq = 0
const nextPieceKey = () => `optimization-piece-${++pieceSeq}`

export const useOptimizationAddingStore = defineStore('addingOptimization', () => {
  const fabricSource = ref<FabricSource | null>(null)
  const customWidthCm = ref('')
  const customHeightCm = ref('')
  const fabric = ref<SelectedItem | null>(null)
  const pattern = ref<SelectedItem | null>(null)
  const algorithmId = ref<number | null>(null)
  const pieces = ref<OptimizationPieceConfig[]>([])
  const piecesPatternId = ref<number | null>(null)
  const seamAllowanceCm = ref('')
  const cuttingAllowanceCm = ref('')
  const isSubmitted = ref(false)

  const isDirty = computed(
    () => 
      !isSubmitted.value &&
      (fabricSource.value !== null || pattern.value !== null || algorithmId.value !== null),
  )

  function markSubmitted() {
    isSubmitted.value = true
  }

  const isFabricConfigured = computed(() => {
    if (fabricSource.value === 'custom') {
      return isValidFabricSideCm(customWidthCm.value) && isValidFabricSideCm(customHeightCm.value)
    }
    if (fabricSource.value === 'library') return fabric.value !== null
    return false
  })

  const allowancesValid = computed(
    () =>
      isValidAllowanceCm(seamAllowanceCm.value, MAX_SEAM_ALLOWANCE_CM) &&
      isValidAllowanceCm(cuttingAllowanceCm.value, MAX_CUTTING_ALLOWANCE_CM),
  )

  const piecesValid = computed(
    () =>
      pieces.value.length > 0 && pieces.value.every((p) => p.normalCount + p.mirroredCount > 0),
  )

  const canSubmit = computed(() => allowancesValid.value && piecesValid.value)

  function selectFabricSource(source: FabricSource) {
    fabricSource.value = source
  }

  function selectFabric(item: SelectedItem) {
    fabric.value = item
  }

  function selectPattern(item: SelectedItem) {
    if (pattern.value?.id !== item.id) {
      pieces.value = []
      piecesPatternId.value = null
    }
    pattern.value = item
  }

  function selectAlgorithm(id: number) {
    algorithmId.value = id
  }

  function initPieces(patternId: number, defaults: PatternPieceDefaults[]) {
    piecesPatternId.value = patternId
    pieces.value = defaults.map((piece) => ({
      key: nextPieceKey(),
      patternPieceId: piece.id,
      normalCount: piece.normalCount,
      mirroredCount: piece.mirroredCount,
      direction: 0,
      twoWay: false,
    }))
  }

  function updatePiece(key: string, partial: Partial<Omit<OptimizationPieceConfig, 'key'>>) {
    const piece = pieces.value.find((p) => p.key === key)
    if (piece) Object.assign(piece, partial)
  }

  function duplicatePiece(key: string) {
    const index = pieces.value.findIndex((p) => p.key === key)
    const source = pieces.value[index]
    if (!source) return
    pieces.value.splice(index + 1, 0, {
      ...source,
      key: nextPieceKey(),
      normalCount: 1,
      mirroredCount: 0,
    })
  }

  function removePiece(key: string) {
    if (pieces.value.length <= 1) return
    pieces.value = pieces.value.filter((p) => p.key !== key)
  }

  function toPayload(): CreateOptimizationPayload | null {
    if (!pattern.value || algorithmId.value === null || !fabricSource.value) return null

    const seam = parseCm(seamAllowanceCm.value)
    const cutting = parseCm(cuttingAllowanceCm.value)
    if (seam === null || cutting === null) return null

    const base = {
      patternId: pattern.value.id,
      algorithmId: algorithmId.value,
      seamAllowanceMm: cmToMm(seam),
      cuttingAllowanceMm: cmToMm(cutting),
      pieces: pieces.value.map(({ key: _key, ...piece }) => piece),
    }

    if (fabricSource.value === 'library') {
      return fabric.value ? { ...base, fabricId: fabric.value.id } : null
    }

    const width = parseCm(customWidthCm.value)
    const height = parseCm(customHeightCm.value)
    if (width === null || height === null) return null
    return { ...base, fabricWidthMm: cmToMm(width), fabricLengthMm: cmToMm(height) }
  }

  function reset() {
    isSubmitted.value = false
    fabricSource.value = null
    customWidthCm.value = ''
    customHeightCm.value = ''
    fabric.value = null
    pattern.value = null
    algorithmId.value = null
    pieces.value = []
    piecesPatternId.value = null
    seamAllowanceCm.value = ''
    cuttingAllowanceCm.value = ''
  }

  return {
    fabricSource,
    customWidthCm,
    customHeightCm,
    fabric,
    pattern,
    algorithmId,
    pieces,
    piecesPatternId,
    seamAllowanceCm,
    cuttingAllowanceCm,
    isDirty,
    isFabricConfigured,
    allowancesValid,
    piecesValid,
    canSubmit,
    isSubmitted,
    markSubmitted,
    selectFabricSource,
    selectFabric,
    selectPattern,
    selectAlgorithm,
    initPieces,
    updatePiece,
    duplicatePiece,
    removePiece,
    toPayload,
    reset,
  }
})
