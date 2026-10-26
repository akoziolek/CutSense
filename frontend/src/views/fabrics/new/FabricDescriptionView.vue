<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import { useAddFabricFormGuard } from '@/composables/fabrics/useAddFabricFormGuard'
import { toPostgisBoundary } from '@/utils/fabricBoundary'

import PageHeader from '@/components/common/PageHeader.vue'
import StepCounter from '@/components/forms/StepCounter.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import DiscardNewFabricModal from '@/components/forms/DiscardChangesModal.vue'
import FabricForm, { type FabricFormPayload } from '@/components/fabrics/FabricForm.vue'

const { isCancelModalOpen, handleCancel, confirmExit } = useAddFabricFormGuard()

const wizardStore = useFabricAddingStore()
const router = useRouter()

const isSubmitting = ref(false)
const submitError = ref('')

const saveDetails = async (payload: Partial<FabricFormPayload>) => {
  try {
    await wizardStore.updateDetails({
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

  const { file, config } = wizardStore

  if (!file || !wizardStore.isShapeConfigured) {
    submitError.value = 'Fabric photo configuration is missing. Return to the previous step.'
    return
  }

  await wizardStore.updateDetails({
    name: payload.name,
    description: payload.description,
    tags: payload.tags,
  })

  const tagIds = payload.tags.map((tag) => tag.id)

  const boundary = toPostgisBoundary(config.points, config)
  const formData = new FormData()
  formData.append('picture', file)
  formData.append('name', payload.name)
  if (payload.description) {
    formData.append('description', payload.description)
  }
  formData.append('boundary', JSON.stringify(boundary))
  formData.append('tagIds', JSON.stringify(tagIds))

  isSubmitting.value = true
  try {
    const createdFabric = await api<{ id: number }>('/fabrics', {
      method: 'POST',
      body: formData,
    })
    await wizardStore.resetWizard()
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
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Fabric details" :show-back="true">
        <template #actions>
          <StepCounter :current-step="3" :total-steps="3" class="mt-2" />
        </template>
      </PageHeader>

      <div class="max-w-3xl bg-background rounded-2xl px-8 py-2 space-y-6 mx-5">
        <FabricForm
          :name="wizardStore.details.name"
          :description="wizardStore.details.description"
          :tags="wizardStore.details.tags"
          :is-submitting="isSubmitting"
          :submit-error="submitError"
          @submit="handleSubmit"
          @cancel="handleCancel"
          @change="saveDetails"
        />
      </div>
    </div>
    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="confirmExit" />
  </GridLayout>
</template>