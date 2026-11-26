import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { api, ApiError } from '@/api/client'
import { login } from '@/stores/authStore'
import type { PatternRatingState } from '@/types/pattern'

export function usePatternRating() {
  const pending = ref(false)
  const signIn = () => login(window.location.pathname + window.location.search)

  const rate = async (
    patternId: number,
    value: number,
    currentRating: number | null,
  ): Promise<PatternRatingState | null> => {
    if (pending.value || value === currentRating) return null

    pending.value = true
    try {
      const result = await api<PatternRatingState>(`/patterns/${patternId}/rating`, {
        method: 'PUT',
        body: JSON.stringify({ rating: value }),
      })
      toast.success(currentRating !== null ? 'Rating updated' : 'Rating saved')
      return result
    } catch (e) {
      toast.error('Could not save your rating', {
        description: e instanceof ApiError ? e.body.message : 'Please try again.',
      })
      return null
    } finally {
      pending.value = false
    }
  }

  return { pending, rate, signIn }
}
