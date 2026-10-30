import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, set, del } from 'idb-keyval'
import type { FabricTag } from '@/types/fabric'

export interface Point2D {
  pctX: number
  pctY: number
}

export interface FabricConfig {
  points: Point2D[]
  pxPerMm: number
  threadAngle: number
  rotation: number
  imageWidth: number
  imageHeight: number
  isConfigured: boolean
}

export interface FabricDetails {
  name: string
  description: string
  tags: FabricTag[]
}

const STORAGE_FILE_KEY = 'adding_fabric_file'
const STORAGE_CONFIG_KEY = 'adding_fabric_config'
const STORAGE_DETAILS_KEY = 'adding_fabric_details'

const DEFAULT_DETAILS: FabricDetails = {
  name: '',
  description: '',
  tags: [],
}

// TODO remove later, for dev purpose
const DEFAULT_CONFIG: FabricConfig = {
  points: [],
  pxPerMm: 0,
  threadAngle: 0,
  rotation: 0,
  imageWidth: 0,
  imageHeight: 0,
  isConfigured: false,
}

export const useFabricAddingStore = defineStore('addingFabric', () => {
  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const config = ref<FabricConfig>({ ...DEFAULT_CONFIG })
  const details = ref<FabricDetails>({
    ...DEFAULT_DETAILS,
    tags: [...DEFAULT_DETAILS.tags],
  })
  const isHydrated = ref(false) // will be false after each F5 => file will be read from IndexDB
  const isConfigPersisted = ref(false)
  let detailsWriteQueue = Promise.resolve()
  let configWriteQueue = Promise.resolve()

  async function setFile(newFile: File) {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = newFile
    previewUrl.value = URL.createObjectURL(newFile)

    // pinia reset configuration options
    config.value = { ...DEFAULT_CONFIG }
    isConfigPersisted.value = false
    details.value = {
      ...DEFAULT_DETAILS,
      tags: [...DEFAULT_DETAILS.tags],
    }

    await Promise.all([detailsWriteQueue, configWriteQueue])
    await Promise.all([
      set(STORAGE_FILE_KEY, newFile),
      del(STORAGE_CONFIG_KEY),
      del(STORAGE_DETAILS_KEY),
    ])
  }

  function updateDetails(partialDetails: Partial<FabricDetails>) {
    details.value = {
      ...details.value,
      ...partialDetails,
      tags: partialDetails.tags ? [...partialDetails.tags] : [...details.value.tags],
    }

    const snapshot = JSON.parse(JSON.stringify(details.value)) as FabricDetails

    const write = detailsWriteQueue.then(() => set(STORAGE_DETAILS_KEY, snapshot))
    detailsWriteQueue = write.catch((error: unknown) => {
      console.error('Error saving fabric details to IndexedDB:', error)
    })
    return write
  }

  function updateConfig(partialConfig: Partial<FabricConfig>, confirmConfiguration = false) {
    config.value = {
      ...config.value,
      ...partialConfig,
      isConfigured: confirmConfiguration || config.value.isConfigured,
    }
    isConfigPersisted.value = false

    const snapshot = JSON.parse(JSON.stringify(config.value)) as FabricConfig
    const write = configWriteQueue.then(() => set(STORAGE_CONFIG_KEY, snapshot))
    configWriteQueue = write.catch((error: unknown) => {
      console.error('Error saving config to IndexedDB:', error)
    })
    return write.then(
      () => {
        isConfigPersisted.value = true
      },
      (error: unknown) => {
        isConfigPersisted.value = false
        throw error
      },
    )
  }

  // init after e.g. F5
  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const [savedFile, savedConfig, savedDetails] = await Promise.all([
        get<File>(STORAGE_FILE_KEY),
        get<FabricConfig>(STORAGE_CONFIG_KEY),
        get<FabricDetails>(STORAGE_DETAILS_KEY),
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
        isConfigPersisted.value = Boolean(config.value.isConfigured)
      }

      if (savedDetails) {
        details.value = {
          ...DEFAULT_DETAILS,
          ...savedDetails,
          tags: Array.isArray(savedDetails.tags) ? [...savedDetails.tags] : [],
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
    isConfigPersisted.value = false
    details.value = {
      ...DEFAULT_DETAILS,
      tags: [...DEFAULT_DETAILS.tags],
    }

    try {
      await Promise.all([detailsWriteQueue, configWriteQueue])
      await Promise.all([del(STORAGE_FILE_KEY), del(STORAGE_CONFIG_KEY), del(STORAGE_DETAILS_KEY)])
    } catch (error) {
      console.error('Error clearing IndexedDB:', error)
    }
  }

  const isFileLoaded = computed(() => !!file.value)

  const isShapeConfigured = computed(() => {
    if (!isFileLoaded.value) return false

    const hasValidPoints = Array.isArray(config.value.points) && config.value.points.length >= 3
    const hasValidScale = typeof config.value.pxPerMm === 'number' && config.value.pxPerMm > 0

    const hasImageDimensions = config.value.imageWidth > 0 && config.value.imageHeight > 0

    return (
      isConfigPersisted.value &&
      config.value.isConfigured &&
      hasValidPoints &&
      hasValidScale &&
      hasImageDimensions
    )
  })

  return {
    file,
    previewUrl,
    config,
    details,
    isHydrated,
    isFileLoaded,
    isShapeConfigured,
    setFile,
    updateDetails,
    updateConfig,
    initFromIndexedDB,
    resetWizard: reset,
  }
})
