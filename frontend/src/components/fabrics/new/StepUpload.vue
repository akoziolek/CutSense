<script setup lang="ts">
import { computed } from 'vue'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import UploadFileCard from '@/components/forms/UploadFileCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'

const emit = defineEmits<{
  (e: 'next'): void
  (e: 'cancel'): void
}>()

const fabricStore = useFabricAddingStore()

const selectedFile = computed({
  get: () => fabricStore.file,
  set: (newFile) => {
    if (newFile) {
      void fabricStore.setFile(newFile)
    } else {
      fabricStore.file = null
    }
  },
})

const handleSubmit = () => {
  if (!selectedFile.value) return
  emit('next')
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      For best results, upload a high-resolution photo of your fabric. Lay it flat on a clean,
      neutral surface with even lighting. Avoid shadows, wrinkles, and distracting background
      elements.
    </p>

    <main class="flex flex-col items-center px-3 pb-14">
      <UploadFileCard v-model="selectedFile" />

      <FormFloatingActions
        cancel-label="Cancel"
        next-label="Calibrate"
        :disabled="!selectedFile"
        @cancel="emit('cancel')"
        @next="handleSubmit"
      />
    </main>
  </div>
</template>
