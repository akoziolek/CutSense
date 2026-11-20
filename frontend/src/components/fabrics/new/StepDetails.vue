<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import FabricForm from '@/components/fabrics/FabricForm.vue'
import type { FabricFormPayload } from '@/types/fabric'
import { useCreateFabric } from '@/composables/wizards/useFabricWizard'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const fabricStore = useFabricAddingStore()
const router = useRouter()
const { isSubmitting, submitError, createFabric } = useCreateFabric()

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
  const createdId = await createFabric(payload)
  if (createdId !== null) {
    await router.push({ name: 'FabricDetails', params: { id: createdId } })
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
