import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CreateOptimizationPayload,
  PatternPieceDefaults,
  PoolFabric,
  SelectedItem,
  WizardPieceConfig,
} from '@/types/optimization'
import type { PointMm } from '@/types/geometry'
import {
  MAX_CUTTING_ALLOWANCE_CM,
  MAX_SEAM_ALLOWANCE_CM,
  cmToMm,
  isValidAllowanceCm,
  parseCm,
} from '@/utils/optimizationConfig'

let pieceSeq = 0
const nextPieceKey = () => `optimization-piece-${++pieceSeq}`

let fabricSeq = 0
const nextFabricKey = () => `optimization-fabric-${++fabricSeq}`

export const fabricLabel = (f: PoolFabric) =>
  f.source === 'library' ? f.name : `${f.widthCm} × ${f.heightCm} cm`

export const useOptimizationAddingStore = defineStore('addingOptimization', () => {
  const pattern = ref<SelectedItem | null>(null)
  const algorithmId = ref<number | null>(null)
  const pieces = ref<WizardPieceConfig[]>([])
  const piecesPatternId = ref<number | null>(null)
  const piecePoints = ref<Record<number, PointMm[]>>({})
  const fabricPool = ref<PoolFabric[]>([])
  const seamAllowanceCm = ref('')
  const cuttingAllowanceCm = ref('')
  const isSubmitted = ref(false)

  const isDirty = computed(
    () =>
      !isSubmitted.value &&
      (pattern.value !== null || fabricPool.value.length > 0 || algorithmId.value !== null),
  )

  function markSubmitted() {
    isSubmitted.value = true
  }

  // ---------- validation ----------
  const allowancesValid = computed(
    () =>
      isValidAllowanceCm(seamAllowanceCm.value, MAX_SEAM_ALLOWANCE_CM) &&
      isValidAllowanceCm(cuttingAllowanceCm.value, MAX_CUTTING_ALLOWANCE_CM),
  )

  const piecesValid = computed(
    () =>
      pieces.value.length > 0 && pieces.value.every((p) => p.normalCount + p.mirroredCount > 0),
  )

  const elementsValid = computed(() => allowancesValid.value && piecesValid.value)

  const piecesAssigned = computed(
    () =>
      pieces.value.length > 0 &&
      pieces.value.every((p) => p.fabricKey && fabricPool.value.some((f) => f.key === p.fabricKey)),
  )

  const canSubmit = computed(() => elementsValid.value && piecesAssigned.value)

  const numberedPieces = computed(() => {
    const order = new Map<number, number>()
    const copies = new Map<number, number>()
    return pieces.value.map((piece) => {
      if (!order.has(piece.patternPieceId)) order.set(piece.patternPieceId, order.size + 1)
      const copy = copies.get(piece.patternPieceId) ?? 0
      copies.set(piece.patternPieceId, copy + 1)
      return {
        piece,
        number: order.get(piece.patternPieceId)!,
        copy,
        points: piecePoints.value[piece.patternPieceId] ?? [],
      }
    })
  })

  const piecesPerFabric = computed(() => {
    const map = new Map<string, string[]>()
    for (const p of pieces.value) {
      if (p.fabricKey) map.set(p.fabricKey, [...(map.get(p.fabricKey) ?? []), p.key])
    }
    return map
  })

  // ---------- pattern / algorithm ----------
  function selectPattern(item: SelectedItem) {
    if (pattern.value?.id !== item.id) {
      pieces.value = []
      piecesPatternId.value = null
      fabricPool.value = []
    }
    pattern.value = item
  }

  function selectAlgorithm(id: number) {
    algorithmId.value = id
  }

  // ---------- pieces ----------
  function initPieces(patternId: number, defaults: PatternPieceDefaults[]) {
    piecesPatternId.value = patternId
    piecePoints.value = Object.fromEntries(defaults.map((piece) => [piece.id, piece.points]))
    fabricPool.value = []
    pieces.value = defaults.map((piece) => ({
      key: nextPieceKey(),
      patternPieceId: piece.id,
      normalCount: piece.normalCount,
      mirroredCount: piece.mirroredCount,
      direction: 0,
      twoWay: false,
      fabricKey: null,
    }))
  }

  function updatePiece(
    key: string,
    partial: Partial<Omit<WizardPieceConfig, 'key' | 'fabricKey'>>,
  ) {
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
    pruneFabrics()
  }

  // ---------- fabrics ----------
  // a fabric only exists while at least one piece uses it
  function pruneFabrics() {
    const used = new Set(pieces.value.map((p) => p.fabricKey))
    fabricPool.value = fabricPool.value.filter((f) => used.has(f.key))
  }

  function addCustomFabric(widthCm: string, heightCm: string, grainline: number): string {
    const key = nextFabricKey()
    fabricPool.value.push({ key, source: 'custom', widthCm, heightCm, grainline })
    return key
  }

  // one library fabric is always one layout, so reuse it when it is already in the pool
  function addLibraryFabric(item: SelectedItem): string {
    const existing = fabricPool.value.find((f) => f.source === 'library' && f.fabricId === item.id)
    if (existing) return existing.key
    const key = nextFabricKey()
    fabricPool.value.push({ key, source: 'library', fabricId: item.id, name: item.name })
    return key
  }

  function assignPieces(pieceKeys: string[], fabricKey: string | null) {
    const keys = new Set(pieceKeys)
    pieces.value.forEach((p) => {
      if (keys.has(p.key)) p.fabricKey = fabricKey
    })
    pruneFabrics()
  }

  function toPayloads(): CreateOptimizationPayload[] | null {
    if (!pattern.value || algorithmId.value === null || !canSubmit.value) return null

    const seam = parseCm(seamAllowanceCm.value)
    const cutting = parseCm(cuttingAllowanceCm.value)
    if (seam === null || cutting === null) return null

    const payloads: CreateOptimizationPayload[] = []

    for (const fabric of fabricPool.value) {
      const keys = new Set(piecesPerFabric.value.get(fabric.key) ?? [])
      if (keys.size === 0) continue

      const base = {
        patternId: pattern.value.id,
        algorithmId: algorithmId.value,
        seamAllowanceMm: cmToMm(seam),
        cuttingAllowanceMm: cmToMm(cutting),
        pieces: pieces.value
          .filter((p) => keys.has(p.key))
          .map(({ key: _key, fabricKey: _fabricKey, ...piece }) => piece),
      }

      if (fabric.source === 'library') {
        payloads.push({ ...base, fabricId: fabric.fabricId })
        continue
      }

      const width = parseCm(fabric.widthCm)
      const height = parseCm(fabric.heightCm)
      if (width === null || height === null) return null
      payloads.push({
        ...base,
        fabricWidthMm: cmToMm(width),
        fabricLengthMm: cmToMm(height),
        fabricGrainline: fabric.grainline,
      })
    }

    return payloads.length ? payloads : null
  }

  function reset() {
    isSubmitted.value = false
    pattern.value = null
    algorithmId.value = null
    pieces.value = []
    piecesPatternId.value = null
    piecePoints.value = {}
    fabricPool.value = []
    seamAllowanceCm.value = ''
    cuttingAllowanceCm.value = ''
  }

  return {
    pattern,
    algorithmId,
    pieces,
    piecesPatternId,
    fabricPool,
    seamAllowanceCm,
    cuttingAllowanceCm,
    isDirty,
    isSubmitted,
    allowancesValid,
    piecesValid,
    elementsValid,
    piecesAssigned,
    canSubmit,
    numberedPieces,
    piecesPerFabric,
    markSubmitted,
    selectPattern,
    selectAlgorithm,
    initPieces,
    updatePiece,
    duplicatePiece,
    removePiece,
    addCustomFabric,
    addLibraryFabric,
    assignPieces,
    toPayloads,
    reset,
  }
})