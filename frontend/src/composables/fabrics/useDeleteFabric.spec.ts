import { describe, expect, it, vi, afterEach } from 'vitest'
import { ApiError, api } from '@/api/client'
import { useDeleteFabric } from '../useDeleteResource'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: vi.fn() }
})
const apiMock = vi.mocked(api)

afterEach(() => {
  apiMock.mockReset()
  push.mockReset()
})

describe('useDeleteFabric', () => {
  it('opens the confirmation without calling the API', () => {
    const d = useDeleteFabric(() => 7)
    d.request()

    expect(d.confirmOpen.value).toBe(true)
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('sends DELETE, then swaps the confirmation for the success message', async () => {
    apiMock.mockResolvedValue(undefined)
    const d = useDeleteFabric(() => 7)
    d.request()

    await d.confirm()

    expect(apiMock).toHaveBeenCalledWith('/fabrics/7', { method: 'DELETE' })
    expect(d.confirmOpen.value).toBe(false)
    expect(d.successOpen.value).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects to the list only after the success message is closed', () => {
    const d = useDeleteFabric(() => 7)
    d.successOpen.value = true

    d.closeSuccess()

    expect(d.successOpen.value).toBe(false)
    expect(push).toHaveBeenCalledWith('/fabrics')
  })

  it('keeps the dialog open and shows the API message on failure', async () => {
    apiMock.mockRejectedValue(
      new ApiError(404, { statusCode: 404, errorCode: 'RESOURCE_NOT_FOUND', message: 'Gone' }),
    )
    const d = useDeleteFabric(() => 7)
    d.request()

    await d.confirm()

    expect(d.confirmOpen.value).toBe(true)
    expect(d.successOpen.value).toBe(false)
    expect(d.error.value).toBe('Gone')
    expect(d.isDeleting.value).toBe(false)
  })

  it('ignores a second confirm while the first request is running', async () => {
    let resolve!: (v: unknown) => void
    apiMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const d = useDeleteFabric(() => 7)

    const first = d.confirm()
    await d.confirm()

    expect(apiMock).toHaveBeenCalledTimes(1)
    resolve(undefined)
    await first
  })
})