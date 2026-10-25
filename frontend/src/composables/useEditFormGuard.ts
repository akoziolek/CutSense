import { ref, unref, type Ref } from 'vue'
import { useRouter, onBeforeRouteLeave, type RouteLocationRaw } from 'vue-router'

export function useEditFabricFormGuard(isDirty: Ref<boolean>, defaultTarget?: RouteLocationRaw) {
  const router = useRouter()

  const isCancelModalOpen = ref(false)
  const isLeavingAllowed = ref(false)
  const targetRoute = ref<RouteLocationRaw | null>(null)
  const getResolvedDestination = (): RouteLocationRaw | null => {
    return targetRoute.value || (defaultTarget ? unref(defaultTarget) : null)
  }

  const resetGuard = () => {
    isCancelModalOpen.value = false
    isLeavingAllowed.value = false
    targetRoute.value = null
  }

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

    const destination = getResolvedDestination()

    if (destination) {
      void router.push(destination)
    } else {
      router.back()
    }
  }

  return {
    isCancelModalOpen,
    handleCancel,
    confirmExit,
    resetGuard
  }
}
