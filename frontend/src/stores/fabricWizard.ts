import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFabricWizardStore = defineStore('fabricWizard', () => {
  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)

  const fabricDetails = ref({
    name: '',
    description: '',
    tags: [],
  })

  function setFile(newFile: File) {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    file.value = newFile
    previewUrl.value = URL.createObjectURL(newFile)
  }

  function resetWizard() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    file.value = null
    previewUrl.value = null
    fabricDetails.value = { name: '', description: '', tags: [] }
  }

  return {
    file,
    previewUrl,
    fabricDetails,
    setFile,
    resetWizard,
  }
})
