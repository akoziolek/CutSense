<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { toPostgisBoundary } from '@/utils/fabricBoundary'
import FabricForm, { type FabricFormPayload } from '@/components/fabrics/FabricForm.vue'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const fabricStore = useFabricAddingStore()
const router = useRouter()

const isSubmitting = ref(false)
const submitError = ref('')

const saveDetails = async (payload: Partial<FabricFormPayload>) => {
  try {
    await fabricStore.updateDetails({
      name: payload.name,
      description: payload.description,
      tags: payload.tags,
    })
  } catch (error) {
    console.error('Failed to save fabric details draft:', error)
  }
}

const handleSubmit = async (payload: FabricFormPayload) => {
  submitError.value = ''
  if (isSubmitting.value) return

  const { file, config } = fabricStore

  if (!file || !fabricStore.isShapeConfigured) {
    submitError.value = 'Fabric photo configuration is missing. Return to the previous step.'
    return
  }

  await fabricStore.updateDetails({
    name: payload.name,
    description: payload.description,
    tags: payload.tags,
  })

  const tagIds = payload.tags.map((tag) => tag.id)

  const boundary = toPostgisBoundary(config.points, config)
  const imageWidthCm = config.imageWidth / config.pxPerCm
  const imageHeightCm = config.imageHeight / config.pxPerCm
  const formData = new FormData()
  formData.append('picture', file)
  formData.append('name', payload.name)
  if (payload.description) {
    formData.append('description', payload.description)
  }
  formData.append('boundary', JSON.stringify(boundary))
  formData.append('imageWidthCm', String(imageWidthCm))
  formData.append('imageHeightCm', String(imageHeightCm))
  formData.append('tagIds', JSON.stringify(tagIds))

  isSubmitting.value = true
  try {
    const createdFabric = await api<{ id: number }>('/fabrics', {
      method: 'POST',
      body: formData,
    })
    await fabricStore.resetWizard()
    await router.push({ name: 'FabricDetails', params: { id: createdFabric.id } })
  } catch (error) {
    console.error('Failed to create fabric:', error)
    submitError.value =
      error instanceof ApiError ? error.body.message : 'Could not save fabric. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl bg-background rounded-2xl px-8 py-2 space-y-6 mx-auto sm:mx-5">
    <FabricForm
      :name="fabricStore.details.name"
      :description="fabricStore.details.description"
      :tags="fabricStore.details.tags"
      :is-submitting="isSubmitting"
      :submit-error="submitError"
      @submit="handleSubmit"
      @cancel="emit('cancel')"
      @change="saveDetails"
    />
  </div>
</template>
