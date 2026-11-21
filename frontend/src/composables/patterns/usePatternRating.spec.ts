import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { login } from '@/stores/authStore'
import { toast } from 'vue-sonner'
import { usePatternRating } from './usePatternRating'

vi.mock('@/api/client', () => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {
    body = { message: 'Request failed' }
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/stores/authStore', () => ({
  login: vi.fn(),
}))

const apiMock = vi.mocked(api)

afterEach(() => {
  vi.clearAllMocks()
})

describe('usePatternRating', () => {
  it('saves a rating and reports the updated rating state', async () => {
    const state = { userRating: 4, starCount: 6, starAverage: '4.50' }
    apiMock.mockResolvedValue(state)
    const { pending, rate } = usePatternRating()

    await expect(rate(12, 4, null)).resolves.toEqual(state)

    expect(apiMock).toHaveBeenCalledWith('/patterns/12/rating', {
      method: 'PUT',
      body: JSON.stringify({ rating: 4 }),
    })
    expect(toast.success).toHaveBeenCalledWith('Rating saved')
    expect(pending.value).toBe(false)
  })

  it('does not send an unchanged rating', async () => {
    const { rate } = usePatternRating()

    await expect(rate(12, 4, 4)).resolves.toBeNull()

    expect(apiMock).not.toHaveBeenCalled()
  })

  it('redirects to login while preserving the current path and query', () => {
    window.history.replaceState({}, '', '/patterns/12?tab=details')
    const { signIn } = usePatternRating()

    signIn()

    expect(login).toHaveBeenCalledWith('/patterns/12?tab=details')
  })

  it('shows an error and clears pending when saving fails', async () => {
    apiMock.mockRejectedValue(new Error('Network error'))
    const { pending, rate } = usePatternRating()

    await expect(rate(12, 3, null)).resolves.toBeNull()

    expect(toast.error).toHaveBeenCalledWith('Could not save your rating', {
      description: 'Please try again.',
    })
    expect(pending.value).toBe(false)
  })
})
