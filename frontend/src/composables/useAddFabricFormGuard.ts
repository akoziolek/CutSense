import { ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useFabricAddingStore } from '@/stores/addingFabricStore'

// steps of the form
const FORM_ROUTE_NAMES = ['AddFabric', 'FabricPhotoConfig', 'FabricDescription']

export function useAddFabricFormGuard() {
  const router = useRouter()
  const wizardStore = useFabricAddingStore()

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
    await wizardStore.resetWizard()
  }

  onBeforeRouteLeave((to) => {
    if (isLeavingAllowed.value) return true

    if (to.name && FORM_ROUTE_NAMES.includes(to.name as string)) {
      return true
    }

    const isStoreEmpty = !wizardStore.file && !wizardStore.previewUrl

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
