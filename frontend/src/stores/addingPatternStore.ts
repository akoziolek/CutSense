import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { get, set, del } from 'idb-keyval'
import type { Point2D } from '@/types/geometry'
import type { NameTag } from '@/types/patterns'

export interface PatternPhotoData {
  shapes: Point2D[][]
  shapeIds: string[]
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
  shapeId: string
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

const createShapeId = (): string => crypto.randomUUID()

export const usePatternAddingStore = defineStore('addingPattern', () => {
  const photos = ref<File[]>([])
  const photoConfigs = ref<PatternPhotoData[]>([])
  const pieces = ref<PatternPiece[]>([])
  const details = ref<PatternDetails>({ ...DEFAULT_DETAILS })
  const isHydrated = ref(false)

  function sanitizePhotoConfig(config?: Partial<PatternPhotoData>): PatternPhotoData {
    const shapes =
      config?.shapes && config.shapes.length > 0
        ? config.shapes
        : [JSON.parse(JSON.stringify(DEFAULT_SHAPE))]

    const hiddenShapes = shapes.map((_, idx) => config?.hiddenShapes?.[idx] ?? idx !== 0)
    const shapeIds = shapes.map((_, idx) => {
      const savedId = config?.shapeIds?.[idx]
      return savedId && !config.shapeIds?.slice(0, idx).includes(savedId)
        ? savedId
        : createShapeId()
    })

    return {
      shapes: JSON.parse(JSON.stringify(shapes)),
      shapeIds,
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

  const persistConfigs = () =>
    set(STORAGE_CONFIGS_KEY, JSON.parse(JSON.stringify(photoConfigs.value)))
  const persistPieces = () => set(STORAGE_PIECES_KEY, JSON.parse(JSON.stringify(pieces.value)))
  const persistDetails = () => set(STORAGE_DETAILS_KEY, JSON.parse(JSON.stringify(details.value)))

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

    await Promise.all([
      set(STORAGE_PHOTOS_KEY, newPhotos),
      set(STORAGE_CONFIGS_KEY, updatedConfigs),
      set(STORAGE_PIECES_KEY, []),
    ])
  }

  function syncPiecesFromConfigs() {
    const newPieces: PatternPiece[] = []
    let counter = 1

    photoConfigs.value.forEach((config, photoIdx) => {
      config.shapes.forEach((_, shapeIdx) => {
        const shapeId = config.shapeIds[shapeIdx]
        if (!shapeId) return

        const existing = pieces.value.find(
          (p) =>
            p.shapeId === shapeId ||
            (p.photoIndex === photoIdx &&
              (p as unknown as { shapeIndex?: number }).shapeIndex === shapeIdx),
        )

        if (existing) {
          newPieces.push({
            ...existing,
            id: `piece-${shapeId}`,
            photoIndex: photoIdx,
            shapeId,
            name: existing.name || `Piece #${counter}`,
          })
        } else {
          newPieces.push({
            id: `piece-${shapeId}`,
            photoIndex: photoIdx,
            shapeId,
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
    void persistPieces()
  }

  function updatePiece(id: string, partial: Partial<PatternPiece>) {
    const piece = pieces.value.find((p) => p.id === id)
    if (piece) {
      Object.assign(piece, partial)
      void persistPieces()
    }
  }

  function removeShape(photoIndex: number, shapeIndex: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    const targetShapeId = config.shapeIds[shapeIndex]

    config.shapes.splice(shapeIndex, 1)
    config.shapeIds.splice(shapeIndex, 1)
    config.hiddenShapes.splice(shapeIndex, 1)

    if (targetShapeId) {
      const targetPieceIdx = pieces.value.findIndex((p) => p.shapeId === targetShapeId)
      if (targetPieceIdx !== -1) {
        pieces.value.splice(targetPieceIdx, 1)
      }
    }

    void persistConfigs()
    void persistPieces()
  }

  function removePieceById(id: string) {
    const piece = pieces.value.find((p) => p.id === id)
    if (piece) {
      const photoConfig = photoConfigs.value[piece.photoIndex]
      if (photoConfig) {
        const shapeIndex = photoConfig.shapeIds.indexOf(piece.shapeId)
        if (shapeIndex !== -1) {
          removeShape(piece.photoIndex, shapeIndex)
        }
      }
    }
  }

  function setPhotoShapes(photoIndex: number, shapes: Point2D[][]) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.shapes = JSON.parse(JSON.stringify(shapes))
    config.shapeIds = shapes.map(() => createShapeId())
    config.hiddenShapes = shapes.map((_, idx) => idx !== 0)
    config.isAnalyzed = true
    config.isAnalyzing = false

    syncPiecesFromConfigs()
    return persistConfigs()
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
    return persistConfigs()
  }

  function addShape(photoIndex: number, newShape: Point2D[], shapeId = createShapeId()) {
    if (!newShape || !Array.isArray(newShape) || newShape.length < 3) {
      return null
    }

    const config = photoConfigs.value[photoIndex]
    if (!config) return null

    config.shapes.push(JSON.parse(JSON.stringify(newShape)))
    config.shapeIds.push(shapeId)
    config.hiddenShapes.push(true)

    syncPiecesFromConfigs()
    void persistConfigs()
    return config.shapes.length - 1
  }

  function insertShapeAtIndex(
    photoIndex: number,
    shapeIndex: number,
    newShape: Point2D[],
    shapeId = createShapeId(),
  ) {
    if (!newShape || !Array.isArray(newShape) || newShape.length < 3) {
      return null
    }

    const config = photoConfigs.value[photoIndex]
    if (!config) return null

    const cloned = JSON.parse(JSON.stringify(newShape))
    if (shapeIndex >= config.shapes.length) {
      config.shapes.push(cloned)
      config.shapeIds.push(shapeId)
      config.hiddenShapes.push(true)
    } else {
      config.shapes.splice(shapeIndex, 0, cloned)
      config.shapeIds.splice(shapeIndex, 0, shapeId)
      config.hiddenShapes.splice(shapeIndex, 0, true)
    }

    syncPiecesFromConfigs()
    void persistConfigs()
    return shapeIndex
  }

  function getShapeId(photoIndex: number, shapeIndex: number) {
    return photoConfigs.value[photoIndex]?.shapeIds[shapeIndex]
  }

  function findShapeIndex(photoIndex: number, shapeId: string) {
    return photoConfigs.value[photoIndex]?.shapeIds.indexOf(shapeId) ?? -1
  }

  function removeShapeById(photoIndex: number, shapeId: string) {
    const shapeIndex = findShapeIndex(photoIndex, shapeId)
    if (shapeIndex < 0) return null
    removeShape(photoIndex, shapeIndex)
    return shapeIndex
  }

  function updateShapePoints(photoIndex: number, shapeIndex: number, points: Point2D[]) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.shapes[shapeIndex] = JSON.parse(JSON.stringify(points))
    return persistConfigs()
  }

  function updatePhotoScale(photoIndex: number, pxPerMm: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config || pxPerMm <= 0) return

    config.pxPerMm = pxPerMm
    return persistConfigs()
  }

  function updatePhotoRotation(photoIndex: number, rotation: number) {
    const config = photoConfigs.value[photoIndex]
    if (!config) return

    config.rotation = rotation
    return persistConfigs()
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
    await persistConfigs()
  }

  function updateDetails(partialDetails: Partial<PatternDetails>) {
    details.value = {
      ...details.value,
      ...partialDetails,
      tags: partialDetails.tags ? [...partialDetails.tags] : [...details.value.tags],
    }
    return persistDetails()
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
    insertShapeAtIndex,
    getShapeId,
    findShapeIndex,
    removeShapeById,
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
