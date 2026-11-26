import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { PatternCarouselPiece, PatternImage } from '@/types/pattern'
import type { NameTag } from '@/types/common'

export interface PatternDetailsResponse {
  id: number
  userId: number
  name: string
  description?: string
  size: string
  visibility: 'PUBLIC' | 'PRIVATE'
  minFabricLengthMM: number | null
  minFabricWidthMM: number | null
  starCount: number
  starAverage: string
  tags: NameTag[]
  createdAt: string
  author: { id: number; nickname: string }
  pieces: PatternCarouselPiece[]
  images: PatternImage[]
  isFavourite: boolean
  userRating: number | null
}

const POLL_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]
const FRESHNESS_WINDOW_MS = 60_000

export function usePatternDetails() {
  const { t } = useI18n()

  const pattern = ref<PatternDetailsResponse | null>(null)
  const isFetching = ref(true)
  const showSkeleton = ref(false)
  const error = ref('')
  const isNotFound = ref(false)
  const minLengthStatus = ref<'calculating' | 'unavailable' | null>(null)

  let skeletonTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  const clearSkeletonTimer = () => {
    if (skeletonTimer) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  const clearPollTimer = () => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const startMinLengthPolling = (id: string, activeSignal: { active: boolean }, attempt = 0) => {
    if (!activeSignal.active) return
    if (attempt >= POLL_DELAYS_MS.length) {
      clearPollTimer()
      minLengthStatus.value = 'unavailable'
      return
    }

    minLengthStatus.value = 'calculating'
    pollTimer = setTimeout(async () => {
      try {
        const updated = await api<PatternDetailsResponse>(`/patterns/${encodeURIComponent(id)}`)
        if (!activeSignal.active) return

        if (typeof updated.minFabricLengthMM === 'number' && pattern.value) {
          pattern.value.minFabricLengthMM = updated.minFabricLengthMM
          pattern.value.minFabricWidthMM = updated.minFabricWidthMM
          minLengthStatus.value = null
          clearPollTimer()
          return
        }
      } catch {
        // ignore transient network errors during background polling
      }

      startMinLengthPolling(id, activeSignal, attempt + 1)
    }, POLL_DELAYS_MS[attempt])
  }

  const fetchPattern = async (id: string, activeSignal = { active: true }) => {
    clearSkeletonTimer()
    clearPollTimer()
    minLengthStatus.value = null
    pattern.value = null
    error.value = ''
    isNotFound.value = false
    isFetching.value = true
    showSkeleton.value = false

    skeletonTimer = setTimeout(() => {
      if (activeSignal.active && isFetching.value) {
        showSkeleton.value = true
      }
    }, 150)

    try {
      const result = await api<PatternDetailsResponse>(`/patterns/${encodeURIComponent(id)}`)
      if (activeSignal.active) {
        pattern.value = result

        if (typeof result.minFabricLengthMM !== 'number') {
          const isFresh = Date.now() - new Date(result.createdAt).getTime() < FRESHNESS_WINDOW_MS
          if (isFresh) {
            startMinLengthPolling(id, activeSignal)
          } else {
            minLengthStatus.value = 'unavailable'
          }
        }
      }
    } catch (e) {
      if (activeSignal.active) {
        isNotFound.value = e instanceof ApiError && e.status === 404
        error.value = e instanceof ApiError ? e.body.message : t('patterns.loadFailed')
      }
    } finally {
      if (activeSignal.active) {
        isFetching.value = false
        showSkeleton.value = false
        clearSkeletonTimer()
      }
    }
  }

  return {
    pattern,
    isFetching,
    showSkeleton,
    error,
    isNotFound,
    minLengthStatus,
    clearSkeletonTimer,
    clearPollTimer,
    fetchPattern,
  }
}
