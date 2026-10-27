import { ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useFabricAddingStore } from '@/stores/addingFabricStore'

export function useNewFabricFormGuard() {
  const router = useRouter()
  const fabricStore = useFabricAddingStore()

  const isCancelModalOpen = ref(false)
  const isLeavingAllowed = ref(false)
  const targetRoute = ref<string>('/fabrics')

  const handleCancel = () => {
    targetRoute.value = '/fabrics'
    isCancelModalOpen.value = true
  }

  const confirmExit = async () => {
    isLeavingAllowed.value = true
    isCancelModalOpen.value = false
    router.push(targetRoute.value)
    await fabricStore.resetWizard()
  }

  onBeforeRouteLeave((to) => {
    if (isLeavingAllowed.value) return true

    const isStoreEmpty = !fabricStore.file && !fabricStore.previewUrl

    if (isStoreEmpty) return true

    targetRoute.value = to.fullPath
    isCancelModalOpen.value = true
    return false
  })

  return {
    isCancelModalOpen,
    handleCancel,
    confirmExit,
  }
}
