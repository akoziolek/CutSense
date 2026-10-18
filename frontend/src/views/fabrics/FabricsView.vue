<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import UploadFileModal from '@/components/common/UploadFileModal.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import { useRoute, useRouter } from 'vue-router'
import { useFabricWizardStore } from '@/stores/fabricWizard'

const isModalOpen = ref(false)
const isLoading = ref(false)
const router = useRouter()
const route = useRoute()
const wizardStore = useFabricWizardStore()

onMounted(() => {
  if (route.query.upload === 'true') {
    isModalOpen.value = true
  }
})

watch(
  () => route.query.upload,
  (shouldOpen) => {
    isModalOpen.value = shouldOpen === 'true'
  },
)

const handleFileSubmit = (file: File) => {
  isLoading.value = true
  wizardStore.setFile(file)
  isModalOpen.value = false
  router.push({ name: 'FabricPhotoConfig' })
  isLoading.value = false
}

const openModal = () => {
  router.push({ query: { ...route.query, upload: 'true' } })
}

const closeModal = () => {
  const query = { ...route.query }
  delete query.upload
  router.replace({ query })
}
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex items-center justify-center text-muted-foreground">
      Coming soon
    </div>

    <FloatingButton @click="openModal" />
    <UploadFileModal
      :open="isModalOpen"
      :loading="isLoading"
      @update:open="(val) => (!val ? closeModal() : openModal())"
      @submit="handleFileSubmit"
    />
  </GridLayout>
</template>
