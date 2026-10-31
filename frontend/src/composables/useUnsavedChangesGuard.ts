import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useRouter, onBeforeRouteLeave, type RouteLocationRaw } from 'vue-router'

export interface UnsavedChangesGuardOptions {
  isDirty: MaybeRefOrGetter<boolean>
  defaultTarget?: MaybeRefOrGetter<RouteLocationRaw | null>
  onConfirmExit?: () => Promise<void> | void
}

export function useUnsavedChangesGuard(options: UnsavedChangesGuardOptions) {
  const router = useRouter()

  const isCancelModalOpen = ref(false)
  const isLeavingAllowed = ref(false)
  const targetRoute = ref<RouteLocationRaw | null>(null)

  const checkIsDirty = () => toValue(options.isDirty)
  const getDefaultTarget = () => (options.defaultTarget ? toValue(options.defaultTarget) : null)

  const handleCancel = () => {
    const destination = getDefaultTarget()

    if (checkIsDirty()) {
      targetRoute.value = destination
      isCancelModalOpen.value = true
    } else if (destination) {
      void router.push(destination)
    } else {
      router.back()
    }
  }

  onBeforeRouteLeave((to) => {
    if (isLeavingAllowed.value || !checkIsDirty()) {
      return true
    }

    targetRoute.value = to.fullPath
    isCancelModalOpen.value = true
    return false
  })

  const confirmExit = async () => {
    isLeavingAllowed.value = true
    isCancelModalOpen.value = false

    if (options.onConfirmExit) {
      await options.onConfirmExit()
    }

    const destination = targetRoute.value || getDefaultTarget()

    if (destination) {
      void router.push(destination)
    } else {
      router.back()
    }
  }

  const resetGuard = () => {
    isCancelModalOpen.value = false
    isLeavingAllowed.value = false
    targetRoute.value = null
  }

  return {
    isCancelModalOpen,
    handleCancel,
    confirmExit,
    resetGuard,
  }
}
