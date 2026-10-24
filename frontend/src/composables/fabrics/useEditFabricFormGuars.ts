import { ref, type Ref } from 'vue'
import { useRouter, onBeforeRouteLeave, type RouteLocationRaw } from 'vue-router'

export function useEditFabricFormGuard(isDirty: Ref<boolean>, defaultTarget?: RouteLocationRaw) {
  const router = useRouter()

  const isCancelModalOpen = ref(false)
  const isLeavingAllowed = ref(false)
  const targetRoute = ref<RouteLocationRaw | null>(null)

  const handleCancel = () => {
    const destination = defaultTarget || null

    if (isDirty.value) {
      targetRoute.value = destination
      isCancelModalOpen.value = true
    } else {
      if (destination) {
        void router.push(destination)
      } else {
        router.back()
      }
    }
  }

  onBeforeRouteLeave((to) => {
    if (isLeavingAllowed.value || !isDirty.value) {
      return true
    }

    targetRoute.value = to.fullPath
    isCancelModalOpen.value = true
    return false
  })

  const confirmExit = () => {
    isLeavingAllowed.value = true
    isCancelModalOpen.value = false

    if (targetRoute.value) {
      void router.push(targetRoute.value)
    } else {
      router.back()
    }
  }

  return {
    isCancelModalOpen,
    handleCancel,
    confirmExit,
  }
}
