<script setup lang="ts">
import { ref } from 'vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import UploadFileModal from '@/components/common/UploadFileModal.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'

const isModalOpen = ref(false)
const isLoading = ref(false)

const handleFileSubmit = async (file: File) => {
  isLoading.value = true
  try {
    console.log('File selected:', file)
    isModalOpen.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <GridLayout>
    <div class="w-full flex-1 flex items-center justify-center text-muted-foreground">
      Coming soon
    </div>

    <FloatingButton @click="isModalOpen = true" />
    <UploadFileModal
      :open="isModalOpen"
      :loading="isLoading"
      @update:open="(val) => (isModalOpen = val)"
      @submit="handleFileSubmit"
    />
  </GridLayout>
</template>
