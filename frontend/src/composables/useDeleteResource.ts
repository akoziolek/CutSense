import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'

export function useDeleteResource(options: {
  basePath: string // '/fabrics', '/patterns'
  noun: string // 'fabric', 'pattern', used in the error message
  redirectTo: string
  getId: () => string | number
}) {
  const router = useRouter()
  const confirmOpen = ref(false)
  const successOpen = ref(false)
  const isDeleting = ref(false)
  const error = ref('')

  const request = () => {
    error.value = ''
    confirmOpen.value = true
  }

  const confirm = async () => {
    if (isDeleting.value) return
    isDeleting.value = true
    error.value = ''
    try {
      await api<void>(`${options.basePath}/${encodeURIComponent(String(options.getId()))}`, {
        method: 'DELETE',
      })
      confirmOpen.value = false
      successOpen.value = true
    } catch (e) {
      error.value =
        e instanceof ApiError ? e.body.message : `Could not delete the ${options.noun}. Please try again.`
    } finally {
      isDeleting.value = false
    }
  }

  const closeSuccess = () => {
    successOpen.value = false
    router.push(options.redirectTo)
  }

  return { confirmOpen, successOpen, isDeleting, error, request, confirm, closeSuccess }
}