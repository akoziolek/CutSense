<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useFabricAddingStore } from '@/stores/addingFabricStore'
import BaseModal from '@/components/common/BaseModal.vue'

const isOpen = defineModel<boolean>('open', { default: false })

const router = useRouter()
const wizardStore = useFabricAddingStore()

const handleConfirm = async () => {
  isOpen.value = false
  await wizardStore.resetWizard()
  router.push('/fabrics')
}
</script>

<template>
  <BaseModal
    v-model:open="isOpen"
    title="Discard changes?"
    description="Are you sure you want to exit? All progress will be lost."
    confirm-label="Yes, discard"
    cancel-label="Continue editing"
    show-cancel
    @confirm="handleConfirm"
    @cancel="isOpen = false"
  />
</template>