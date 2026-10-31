import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { get, set, del } from 'idb-keyval'
import { type Point2D } from '@/types/geometry'
import type { NameTag } from '@/types/patterns'

export interface PatternPhotoData {
  shapes: Point2D[][]
  hiddenShapes: boolean[]
  pxPerMm: number
  rotation: number
  imageWidth: number
  imageHeight: number
  isAnalyzing?: boolean
  isAnalyzed?: boolean
}

export interface PatternPiece {
  id: string
  photoIndex: number
  shapeIndex: number
  name: string
  normal: number
  mirrored: number
  grainline: number
}

export interface PatternDetails {
  name: string
  size: string
  description: string
  tags: NameTag[]
  visibility: 'PRIVATE' | 'PUBLIC'
}

const STORAGE_PHOTOS_KEY = 'adding_pattern_photos'
const STORAGE_CONFIGS_KEY = 'adding_pattern_pieces'
const STORAGE_PIECES_KEY = 'adding_pattern_pieces_data'
const STORAGE_DETAILS_KEY = 'adding_pattern_details'

const DEFAULT_DETAILS: PatternDetails = {
  name: '',
  size: '',
  description: '',
  tags: [],
  visibility: 'PRIVATE',
}

const DEFAULT_SHAPE: Point2D[] = [
  { pctX: 20, pctY: 20 },
  { pctX: 80, pctY: 20 },
  { pctX: 80, pctY: 80 },
  { pctX: 20, pctY: 80 },
]

export const usePatternAddingStore = defineStore('addingPattern', () => {
  const photos = ref<File[]>([])
  const photoConfigs = ref<PatternPhotoData[]>([])
  const pieces = ref<PatternPiece[]>([])
  const details = ref<PatternDetails>({ ...DEFAULT_DETAILS })
  const isHydrated = ref(false)

  let writeQueue = Promise.resolve()

  function sanitizePhotoConfig(config?: Partial<PatternPhotoData>): PatternPhotoData {
    const shapes =
      config?.shapes && config.shapes.length > 0
        ? config.shapes
        : [JSON.parse(JSON.stringify(DEFAULT_SHAPE))]

    const hiddenShapes = shapes.map((_, idx) => config?.hiddenShapes?.[idx] ?? idx !== 0)

    return {
      shapes: JSON.parse(JSON.stringify(shapes)),
      hiddenShapes,
      pxPerMm: typeof config?.pxPerMm === 'number' && config.pxPerMm > 0 ? config.pxPerMm : 1,
      rotation: typeof config?.rotation === 'number' ? config.rotation : 0,
      imageWidth:
        typeof config?.imageWidth === 'number' && config.imageWidth > 0 ? config.imageWidth : 0,
      imageHeight:
        typeof config?.imageHeight === 'number' && config.imageHeight > 0 ? config.imageHeight : 0,
      isAnalyzing: false,
      isAnalyzed: Boolean(config?.isAnalyzed),
    }
  }

  function savePhotoConfigsToIDB() {
    const snapshot = JSON.parse(JSON.stringify(photoConfigs.value))
    writeQueue = writeQueue.then(() => set(STORAGE_CONFIGS_KEY, snapshot))
    return writeQueue
  }

  function savePiecesToIDB() {
    const snapshot = JSON.parse(JSON.stringify(pieces.value))
    writeQueue = writeQueue.then(() => set(STORAGE_PIECES_KEY, snapshot))
    return writeQueue
  }

  const previewUrls = computed(() => photos.value.map((file) => URL.createObjectURL(file)))

  watch(
    previewUrls,
    (_, oldUrls) => {
      if (oldUrls) {
        oldUrls.forEach((url) => URL.revokeObjectURL(url))
      }
    },
    { flush: 'post' },
  )

  async function setPhotos(newPhotos: File[]) {
    const existingPhotos = photos.value
    const existingPhotoConfigs = photoConfigs.value

    const updatedConfigs: PatternPhotoData[] = newPhotos.map((file, idx) => {
      const existingIdx = existingPhotos.findIndex(
        (p) =>
          p === file ||
          (p.name === file.name && p.size === file.size && p.lastModified === file.lastModified),
      )

      if (existingIdx !== -1 && existingPhotoConfigs[existingIdx]) {
        return sanitizePhotoConfig(existingPhotoConfigs[existingIdx])
      }

      if (existingPhotoConfigs[idx] && existingPhotos[idx]?.name === file.name) {
        return sanitizePhotoConfig(existingPhotoConfigs[idx])
      }

      return sanitizePhotoConfig()
    })

    photos.value = newPhotos
    photoConfigs.value = updatedConfigs
    pieces.value = []

    writeQueue = writeQueue.then(async () => {
      await set(STORAGE_PHOTOS_KEY, newPhotos)
      await set(STORAGE_CONFIGS_KEY, updatedConfigs)
      await set(STORAGE_PIECES_KEY, [])
    })
    await writeQueue
  }

  function syncPiecesFromConfigs() {
    const newPieces: PatternPiece[] = []
    let counter = 1

    photoConfigs.value.forEach((config, photoIdx) => {
      config.shapes.forEach((_, shapeIdx) => {
        const existing = pieces.value.find(
          (p) => p.photoIndex === photoIdx && p.shapeIndex === shapeIdx,
        )

        if (existing) {
          newPieces.push({
            ...existing,
            name: existing.name || `Piece #${counter}`,
          })
        } else {
          newPieces.push({
            id: `piece-${photoIdx}-${shapeIdx}`,
            photoIndex: photoIdx,
            shapeIndex: shapeIdx,
            name: `Piece #${counter}`,
            normal: 1,
            mirrored: 0,
            grainline: 0,
          })
        }
        counter++
      })
    })

    pieces.value = newPieces
    void savePiecesToIDB()
  }

  function updatePiece(id: string, partial: Partial<PatternPiece>) {
    const piece = pieces.value.find((p) => p.id === id)
    if (piece) {
      Object.assign(piece, partial)
      void savePiecesToIDB()
    }
  }

  function removePieceById(id: string) {
    const piece = pieces.value.find((p) => p.id === id)
    if (piece) {
      removeShape(piece.photoIndex, piece.shapeIndex)
      pieces.value = pieces.value.filter((p) => p.id !== id)
      void savePiecesToIDB()
    }
  }

  function setPhotoShapes(photoIndex: number, shapes: Point2D[][]) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.shapes = JSON.parse(JSON.stringify(shapes))
    config.hiddenShapes = shapes.map((_, idx) => idx !== 0)
    config.isAnalyzed = true
    config.isAnalyzing = false

    syncPiecesFromConfigs()
    return savePhotoConfigsToIDB()
  }

  function setPhotoAnalyzing(photoIndex: number, isAnalyzing: boolean) {
    if (photoConfigs.value[photoIndex]) {
      photoConfigs.value[photoIndex].isAnalyzing = isAnalyzing
    }
  }

  function toggleShapeVisibility(photoIndex: number, shapeIndex: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.hiddenShapes[shapeIndex] = !config.hiddenShapes[shapeIndex]
    return savePhotoConfigsToIDB()
  }

  function addShape(photoIndex: number, newShape: Point2D[]) {
    if (!newShape || !Array.isArray(newShape) || newShape.length < 3) {
      return null
    }

    const config = photoConfigs.value[photoIndex]
    if (!config) return null

    config.shapes.push(JSON.parse(JSON.stringify(newShape)))
    config.hiddenShapes.push(true)

    syncPiecesFromConfigs()
    void savePhotoConfigsToIDB()
    return config.shapes.length - 1
  }

  function removeShape(photoIndex: number, shapeIndex: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.shapes.splice(shapeIndex, 1)
    config.hiddenShapes.splice(shapeIndex, 1)

    syncPiecesFromConfigs()
    return savePhotoConfigsToIDB()
  }

  function updateShapePoints(photoIndex: number, shapeIndex: number, points: Point2D[]) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.shapes[shapeIndex] = JSON.parse(JSON.stringify(points))
    return savePhotoConfigsToIDB()
  }

  function updatePhotoScale(photoIndex: number, pxPerMm: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config || pxPerMm <= 0) return

    config.pxPerMm = pxPerMm
    return savePhotoConfigsToIDB()
  }

  function updatePhotoRotation(photoIndex: number, rotation: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.rotation = rotation
    return savePhotoConfigsToIDB()
  }

  async function updatePhotoDimensions(
    photoIndex: number,
    imageWidth: number,
    imageHeight: number,
  ) {
    const config = photoConfigs.value[photoIndex]
    if (!config || imageWidth <= 0 || imageHeight <= 0) return

    config.imageWidth = imageWidth
    config.imageHeight = imageHeight
    await savePhotoConfigsToIDB()
  }

  function updateDetails(partialDetails: Partial<PatternDetails>) {
    details.value = {
      ...details.value,
      ...partialDetails,
      tags: partialDetails.tags ? [...partialDetails.tags] : [...details.value.tags],
    }
    const snapshot = JSON.parse(JSON.stringify(details.value)) as PatternDetails
    writeQueue = writeQueue.then(() => set(STORAGE_DETAILS_KEY, snapshot))
    return writeQueue
  }

  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const [savedPhotos, savedConfigs, savedPieces, savedDetails] = await Promise.all([
        get<File[]>(STORAGE_PHOTOS_KEY),
        get<PatternPhotoData[]>(STORAGE_CONFIGS_KEY),
        get<PatternPiece[]>(STORAGE_PIECES_KEY),
        get<PatternDetails>(STORAGE_DETAILS_KEY),
      ])

      if (savedPhotos && Array.isArray(savedPhotos)) {
        photos.value = savedPhotos
        photoConfigs.value = savedPhotos.map((_, idx) => sanitizePhotoConfig(savedConfigs?.[idx]))
      }

      if (savedPieces && Array.isArray(savedPieces)) {
        pieces.value = savedPieces
      }

      if (savedDetails) {
        details.value = {
          ...DEFAULT_DETAILS,
          ...savedDetails,
          visibility: savedDetails.visibility?.toUpperCase() === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
        }
      }

      syncPiecesFromConfigs()
    } catch (error) {
      console.error('Error reading pattern draft from IndexedDB:', error)
    } finally {
      isHydrated.value = true
    }
  }

  async function resetWizard() {
    photos.value = []
    pieces.value = []
    photoConfigs.value = []
    details.value = { ...DEFAULT_DETAILS }

    try {
      await writeQueue
      await Promise.all([
        del(STORAGE_PHOTOS_KEY),
        del(STORAGE_CONFIGS_KEY),
        del(STORAGE_PIECES_KEY),
        del(STORAGE_DETAILS_KEY),
      ])
    } catch (error) {
      console.error('Error clearing pattern IndexedDB:', error)
    }
  }

  const hasPhotos = computed(() => photos.value.length > 0)
  const hasPieces = computed(() => photoConfigs.value.some((p) => p.shapes.length > 0))

  return {
    photos,
    pieces,
    photoConfigs,
    details,
    previewUrls,
    isHydrated,
    hasPhotos,
    hasPieces,
    setPhotos,
    setPhotoShapes,
    setPhotoAnalyzing,
    toggleShapeVisibility,
    removeShape,
    addShape,
    updateShapePoints,
    updatePhotoScale,
    updatePhotoRotation,
    updatePhotoDimensions,
    syncPiecesFromConfigs,
    updatePiece,
    removePieceById,
    updateDetails,
    initFromIndexedDB,
    resetWizard,
  }
})
