import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, set, del } from 'idb-keyval'

const STORAGE_KEY = 'adding_fabric_file'

// pinia store
export const useFabricAddingStore = defineStore('addingFabric', () => {
  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const isHydrated = ref(false) // will be false after each F5 => file will be read from IndexDB

  async function setFile(newFile: File) {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = newFile
    previewUrl.value = URL.createObjectURL(newFile)

    try {
      await set(STORAGE_KEY, newFile) //IndexDB
    } catch (error) {
      console.error('Error occured during saving to IndexedDB:', error)
    }
  }

  // after e.g. F5
  async function initFromIndexedDB() {
    if (isHydrated.value) return

    try {
      const savedFile = await get<File>(STORAGE_KEY)
      if (savedFile) {
        file.value = savedFile
        previewUrl.value = URL.createObjectURL(savedFile)
      }
    } catch (error) {
      console.error('Error occured during read operation in IndexedDB:', error)
    } finally {
      isHydrated.value = true
    }
  }

  async function resetWizard() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = null
    previewUrl.value = null

    try {
      await del(STORAGE_KEY)
    } catch (error) {
      console.error('Error occured during file deletion from IndexedDB:', error)
    }
  }

  return {
    file,
    previewUrl,
    isHydrated,
    setFile,
    initFromIndexedDB,
    resetWizard,
  }
})
