import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import { useAuth } from '@/stores/authStore'
import { PATTERN_SIZE, PATTERN_VISIBILITY, type PatternFormPayload } from '@/types/pattern'
import type { NameTag } from '@/types/common'
import { toast } from 'vue-sonner'

export interface EditablePattern {
  id: number
  userId?: number
  name: string
  size: PATTERN_SIZE | string
  description?: string
  tags: NameTag[]
  visibility: PATTERN_VISIBILITY | string
}

export function usePatternEdit() {
  const { t } = useI18n()
  const { state: auth } = useAuth()

  const pattern = ref<EditablePattern | null>(null)
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')

  const isSubmitting = ref(false)
  const submitError = ref('')

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

  const clearSkeletonTimer = () => {
    if (skeletonTimer) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  const fetchPattern = async (
    id: number,
    activeSignal = { active: true },
  ): Promise<EditablePattern | null> => {
    clearSkeletonTimer()
    pattern.value = null
    error.value = ''
    isFetching.value = true
    showSkeleton.value = false

    skeletonTimer = setTimeout(() => {
      if (activeSignal.active && isFetching.value) {
        showSkeleton.value = true
      }
    }, 150)

    try {
      const result = await api<EditablePattern>(`/patterns/${id}`)

      if (activeSignal.active) {
        const currentUserId = auth.user?.id
        const isOwner = result.userId && currentUserId ? result.userId === currentUserId : false

        if (!isOwner) {
          error.value =
            result.visibility === PATTERN_VISIBILITY.PUBLIC
              ? t('patterns.noEditAccess')
              : t('patterns.loadFailed')
          return null
        }

        pattern.value = result
        return result
      }
      return null
    } catch (e) {
      if (activeSignal.active) {
        if (e instanceof ApiError && e.status === 403) {
          error.value = t('patterns.loadFailed')
        } else {
          error.value = e instanceof ApiError ? e.body.message : t('patterns.loadFailed')
        }
      }
      return null
    } finally {
      if (activeSignal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  const updatePattern = async (id: number, payload: PatternFormPayload): Promise<boolean> => {
    submitError.value = ''
    isSubmitting.value = true

    try {
      await api(`/patterns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          size: payload.size,
          description: payload.description ? payload.description.trim() : null,
          tagIds: payload.tags.map((tag) => tag.id),
          visibility: payload.visibility,
        }),
      })
      toast.success(t('patterns.updateToast'))
      return true
    } catch (e) {
      console.error('Failed to update pattern:', e)
      toast.error(t('patterns.updateErrorToast'))
      submitError.value = e instanceof ApiError ? e.body.message : t('patterns.updateFailed')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    pattern,
    isFetching,
    showSkeleton,
    error,
    isSubmitting,
    submitError,
    clearSkeletonTimer,
    fetchPattern,
    updatePattern,
  }
}
