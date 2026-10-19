<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useAddFabricFormGuard } from '@/composables/useAddFabricFormGuard'
import PageHeader from '@/components/common/PageHeader.vue'
import UploadFileCard from '@/components/forms/UploadFileCard.vue'
import FormFloatingActions from '@/components/forms/FormFloatingActions.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import DiscardNewFabricModal from '@/components/fabrics/DiscardNewFabricModal.vue'

const router = useRouter()
const wizardStore = useFabricAddingStore()

const { isCancelModalOpen, handleCancel, confirmExit } = useAddFabricFormGuard()

const selectedFile = computed({
  get: () => wizardStore.file,
  set: (newFile) => {
    if (newFile) {
      wizardStore.setFile(newFile)
    } else {
      wizardStore.resetWizard()
    }
  },
})

const handleSubmit = async () => {
  if (!selectedFile.value) return

  try {
    await router.push({ name: 'FabricPhotoConfig' })
  } catch (error) {
    console.error('Failed to process file upload:', error)
    toast.error('Failed to save file. Please try again.')
  }
}
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Upload Fabric Photo">
        <template #description>
          For best results, upload a high-resolution photo of your fabric. Lay it flat on a clean,
          neutral surface with even lighting. Avoid shadows, wrinkles, and distracting background
          elements.
        </template>
        <template #actions>
          <StepCounter :current-step="1" :total-steps="3" />
        </template>
      </PageHeader>

      <main class="flex flex-col items-center px-3 pb-14">
        <UploadFileCard v-model="selectedFile" />

        <FormFloatingActions
          cancel-label="Cancel"
          next-label="Calibrate"
          @cancel="handleCancel"
          :disabled="!selectedFile"
          @next="handleSubmit"
        />
      </main>
    </div>

    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>
