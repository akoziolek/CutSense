import { ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { usePatternAddingStore } from '@/stores/addingPatternStore'

export function useNewPatternFormGuard() {
  const router = useRouter()
  const patternStore = usePatternAddingStore()

  const isCancelModalOpen = ref(false)
  const isLeavingAllowed = ref(false)
  const targetRoute = ref<string>('/patterns')

  const handleCancel = () => {
    targetRoute.value = '/patterns'
    isCancelModalOpen.value = true
  }

  const confirmExit = async () => {
    isLeavingAllowed.value = true
    isCancelModalOpen.value = false
    void router.push(targetRoute.value)
    await patternStore.resetWizard()
  }

  onBeforeRouteLeave((to) => {
    if (isLeavingAllowed.value || !patternStore.hasPhotos) return true

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
