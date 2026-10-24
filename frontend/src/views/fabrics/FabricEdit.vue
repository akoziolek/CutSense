<script setup lang="ts">
import FabricForm from '@/components/fabrics/FabricForm.vue'
import GridLayout from '@/components/layouts/GridLayout.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DiscardNewFabricModal from '@/components/fabrics/DiscardNewFabricModal.vue'
import { useRoute } from 'vue-router'
import { useEditFabricFormGuard } from '@/composables/fabrics/useEditFabricFormGuars'
import { onMounted, ref } from 'vue'
import type { FabricFormPayload } from '@/components/fabrics/FabricForm.vue'

const route = useRoute()
const fabricId = Number(route.params.id)
const DRAFT_KEY = `fabric_edit_draft_${fabricId}`
//const detailsRoute = { name: 'FabricDetails', params: { id: fabricId } }

const draftData = ref<Partial<FabricFormPayload>>({})
const isDirty = ref(false)

const { isCancelModalOpen, handleCancel, confirmExit } = useEditFabricFormGuard(
  isDirty,
  //detailsRoute,
)

const handleFormChange = (payload: Partial<FabricFormPayload>) => {
  isDirty.value = true
  draftData.value = payload
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
}

const handleConfirmExit = () => {
  clearDraft()
  confirmExit()
}

const handleSubmit = (payload: FabricFormPayload) => {
  //API
  clearDraft()
  isDirty.value = false
}

onMounted(() => {
  const savedDraft = localStorage.getItem(DRAFT_KEY)
  if (savedDraft) {
    try {
      draftData.value = JSON.parse(savedDraft)
      isDirty.value = true
    } catch (e) {
      console.error('Failed to parse draft from localStorage', e)
      localStorage.removeItem(DRAFT_KEY)
    }
  }
})
</script>

<template>
  <GridLayout>
    <div class="w-full max-w-screen-2xl mx-auto px-8 sm:px-12 lg:px-14 py-8 sm:py-10 space-y-6">
      <PageHeader title="Edit Fabric" />
      <div class="max-w-4xl bg-background rounded-2xl px-4 py-2 space-y-6">
        <FabricForm
          :name="draftData.name"
          :description="draftData.description"
          :tags="draftData.tags"
          @cancel="handleCancel"
          @change="handleFormChange"
          @submit="handleSubmit"
        />
      </div>
    </div>

    <DiscardNewFabricModal v-model:open="isCancelModalOpen" @confirm="handleConfirmExit" />
  </GridLayout>
</template>
