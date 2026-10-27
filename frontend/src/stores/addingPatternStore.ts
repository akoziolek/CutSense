import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del } from 'idb-keyval'

export interface PatternDetails {
  name: string
}

const STORAGE_PHOTOS_KEY = 'adding_pattern_photos'
const STORAGE_DETAILS_KEY = 'adding_pattern_details'

const DEFAULT_DETAILS: PatternDetails = {
  name: '',
}

export const usePatternAddingStore = defineStore('addingPattern', () => {
  const photos = ref<File[]>([])
  const details = ref<PatternDetails>({ ...DEFAULT_DETAILS })
  const isHydrated = ref(false)

  let writeQueue = Promise.resolve()

  async function setPhotos(newPhotos: File[]) {
    photos.value = newPhotos

    writeQueue = writeQueue.then(() => set(STORAGE_PHOTOS_KEY, newPhotos))
    await writeQueue
  }

  function updateDetails(partialDetails: Partial<PatternDetails>) {
    details.value = { ...details.value, ...partialDetails }
    const snapshot = JSON.parse(JSON.stringify(details.value))
    writeQueue = writeQueue.then(() => set(STORAGE_DETAILS_KEY, snapshot))
    return writeQueue
  }

  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const [savedPhotos, savedDetails] = await Promise.all([
        get<File[]>(STORAGE_PHOTOS_KEY),
        get<PatternDetails>(STORAGE_DETAILS_KEY),
      ])

      if (savedPhotos && Array.isArray(savedPhotos)) {
        photos.value = savedPhotos
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
    details.value = { ...DEFAULT_DETAILS }

    try {
      await writeQueue
      await Promise.all([del(STORAGE_PHOTOS_KEY), del(STORAGE_DETAILS_KEY)])
    } catch (error) {
      console.error('Error clearing pattern IndexedDB:', error)
    }
  }

  const hasPhotos = computed(() => photos.value.length > 0)

  return {
    photos,
    details,
    isHydrated,
    hasPhotos,
    setPhotos,
    updateDetails,
    initFromIndexedDB,
    resetWizard,
  }
})
