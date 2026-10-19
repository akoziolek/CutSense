import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, set, del } from 'idb-keyval'

export interface Point2D {
  pctX: number
  pctY: number
}

export interface FabricConfig {
  points: Point2D[]
  pxPerCm: number
  threadAngle: number
  rotation: number
}

const STORAGE_FILE_KEY = 'adding_fabric_file'
const STORAGE_CONFIG_KEY = 'adding_fabric_config'

// TODO remove later, for dev purpose
const DEFAULT_CONFIG: FabricConfig = {
  points: [
    { pctX: 20, pctY: 20 },
    { pctX: 80, pctY: 20 },
    { pctX: 80, pctY: 80 },
    { pctX: 20, pctY: 80 },
  ],
  pxPerCm: 10,
  threadAngle: 0,
  rotation: 0,
}

export const useFabricAddingStore = defineStore('addingFabric', () => {
  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const config = ref<FabricConfig>({ ...DEFAULT_CONFIG })
  const isHydrated = ref(false) // will be false after each F5 => file will be read from IndexDB

  async function setFile(newFile: File) {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = newFile
    previewUrl.value = URL.createObjectURL(newFile)

    // pinia reset configuration options
    config.value = { ...DEFAULT_CONFIG }

    try {
      // set new file and delete configuration options in IndexedDB
      await Promise.all([set(STORAGE_FILE_KEY, newFile), del(STORAGE_CONFIG_KEY)])
    } catch (error) {
      console.error('Error updating file and resetting config in IndexedDB:', error)
    }
  }

  async function updateConfig(partialConfig: Partial<FabricConfig>) {
    config.value = {
      ...config.value,
      ...partialConfig,
    }

    try {
      await set(STORAGE_CONFIG_KEY, JSON.parse(JSON.stringify(config.value)))
    } catch (error) {
      console.error('Error saving config to IndexedDB:', error)
    }
  }

  // init after e.g. F5
  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const [savedFile, savedConfig] = await Promise.all([
        get<File>(STORAGE_FILE_KEY),
        get<FabricConfig>(STORAGE_CONFIG_KEY),
      ])

      if (savedFile) {
        file.value = savedFile
        previewUrl.value = URL.createObjectURL(savedFile)
      }

      if (savedConfig) {
        config.value = {
          ...DEFAULT_CONFIG,
          ...savedConfig,
        }
      }
    } catch (error) {
      console.error('Error reading from IndexedDB:', error)
    } finally {
      isHydrated.value = true
    }
  }

  async function reset() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = null
    previewUrl.value = null
    config.value = { ...DEFAULT_CONFIG }

    try {
      await Promise.all([del(STORAGE_FILE_KEY), del(STORAGE_CONFIG_KEY)])
    } catch (error) {
      console.error('Error clearing IndexedDB:', error)
    }
  }

  return {
    file,
    previewUrl,
    config,
    isHydrated,
    setFile,
    updateConfig,
    initFromIndexedDB,
    resetWizard: reset,
  }
})
