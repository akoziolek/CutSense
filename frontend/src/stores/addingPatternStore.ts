import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del } from 'idb-keyval'

export interface PatternPiece {
  id: string
  name: string
  areaCm2?: number
}

export interface PatternDetails {
  name: string
  size: string
  visibility: 'private' | 'public'
}

const STORAGE_PHOTOS_KEY = 'adding_pattern_photos'
const STORAGE_PIECES_KEY = 'adding_pattern_pieces'
const STORAGE_DETAILS_KEY = 'adding_pattern_details'

const DEFAULT_DETAILS: PatternDetails = {
  name: '',
  size: '',
  visibility: 'private',
}

export const usePatternAddingStore = defineStore('addingPattern', () => {
  const photos = ref<File[]>([])
  const pieces = ref<PatternPiece[]>([])
  const details = ref<PatternDetails>({ ...DEFAULT_DETAILS })
  const isHydrated = ref(false)

  let writeQueue = Promise.resolve()

  async function setPhotos(newPhotos: File[]) {
    photos.value = newPhotos
    pieces.value = []

    writeQueue = writeQueue.then(async () => {
      await set(STORAGE_PHOTOS_KEY, newPhotos)
      await del(STORAGE_PIECES_KEY)
    })
    await writeQueue
  }

  async function addPhotos(incomingFiles: File[]) {
    const updated = [...photos.value, ...incomingFiles]
    await setPhotos(updated)
  }

  async function removePhoto(index: number) {
    const updated = photos.value.filter((_, idx) => idx !== index)
    await setPhotos(updated)
  }

  function setPieces(newPieces: PatternPiece[]) {
    pieces.value = newPieces
    writeQueue = writeQueue.then(() => set(STORAGE_PIECES_KEY, newPieces))
    return writeQueue
  }

  function updateDetails(partialDetails: Partial<PatternDetails>) {
    details.value = { ...details.value, ...partialDetails }
    const snapshot = JSON.parse(JSON.stringify(details.value))
    writeQueue = writeQueue.then(() => set(STORAGE_DETAILS_KEY, snapshot))
    return writeQueue
  }

  function toFormData(): FormData {
    const formData = new FormData()

    photos.value.forEach((file) => {
      formData.append('photos', file)
    })

    formData.append('name', details.value.name.trim())
    formData.append('size', details.value.size)
    formData.append('visibility', details.value.visibility)
    formData.append('pieces', JSON.stringify(pieces.value))

    return formData
  }

  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const [savedPhotos, savedPieces, savedDetails] = await Promise.all([
        get<File[]>(STORAGE_PHOTOS_KEY),
        get<PatternPiece[]>(STORAGE_PIECES_KEY),
        get<PatternDetails>(STORAGE_DETAILS_KEY),
      ])

      if (savedPhotos && Array.isArray(savedPhotos)) {
        photos.value = savedPhotos
      }
      if (savedPieces && Array.isArray(savedPieces)) {
        pieces.value = savedPieces
      }
      if (savedDetails) {
        details.value = { ...DEFAULT_DETAILS, ...savedDetails }
      }
    } catch (error) {
      console.error('Error reading pattern draft from IndexedDB:', error)
    } finally {
      isHydrated.value = true
    }
  }

  async function resetWizard() {
    photos.value = []
    pieces.value = []
    details.value = { ...DEFAULT_DETAILS }

    try {
      await writeQueue
      await Promise.all([
        del(STORAGE_PHOTOS_KEY),
        del(STORAGE_PIECES_KEY),
        del(STORAGE_DETAILS_KEY),
      ])
    } catch (error) {
      console.error('Error clearing pattern IndexedDB:', error)
    }
  }

  const hasPhotos = computed(() => photos.value.length > 0)
  const hasPieces = computed(() => pieces.value.length > 0)

  return {
    photos,
    pieces,
    details,
    isHydrated,
    hasPhotos,
    hasPieces,
    setPhotos,
    addPhotos,
    removePhoto,
    setPieces,
    updateDetails,
    toFormData,
    initFromIndexedDB,
    resetWizard,
  }
})
