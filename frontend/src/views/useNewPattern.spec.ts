// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE, useNewPattern } from '../composables/useNewPattern'

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 200
  naturalHeight = 300
  set src(value: string) {
    queueMicrotask(() => (value.includes('bad') ? this.onerror?.() : this.onload?.()))
  }
}

const file = (name: string, type = 'image/jpeg', size?: number) => {
  const f = new File(['x'], name, { type })
  if (size !== undefined) Object.defineProperty(f, 'size', { value: size })
  return f
}

const revoke = vi.fn()

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  URL.createObjectURL = vi.fn((f: Blob) => `blob:${(f as File).name}`)
  URL.revokeObjectURL = revoke
  useNewPattern().reset()
  revoke.mockClear()
})

afterEach(() => vi.unstubAllGlobals())

describe('useNewPattern', () => {
  describe('addPhotos', () => {
    it('adds a valid photo with its ratio and default width', async () => {
      const { draft, addPhotos } = useNewPattern()
      await addPhotos([file('a.jpg')])

      expect(draft.photos).toHaveLength(1)
      expect(draft.photos[0]).toMatchObject({ url: 'blob:a.jpg', ratio: 1.5, widthCm: 95 })
    })

    it('rejects a wrong file type', async () => {
      const { draft, addPhotos } = useNewPattern()
      await expect(addPhotos([file('a.txt', 'text/plain')])).rejects.toThrow()
      expect(draft.photos).toHaveLength(0)
    })

    it('rejects a file over the size limit', async () => {
      const { draft, addPhotos } = useNewPattern()
      await expect(addPhotos([file('big.jpg', 'image/jpeg', MAX_FILE_SIZE + 1)])).rejects.toThrow()
      expect(draft.photos).toHaveLength(0)
    })

    it('adds nothing when one of several files is invalid', async () => {
      const { draft, addPhotos } = useNewPattern()
      await expect(addPhotos([file('a.jpg'), file('b.txt', 'text/plain')])).rejects.toThrow()
      expect(draft.photos).toHaveLength(0)
    })

    it('adds nothing and frees the URLs when an image cannot be decoded', async () => {
      const { draft, addPhotos } = useNewPattern()
      await expect(addPhotos([file('a.jpg'), file('bad.jpg')])).rejects.toThrow()
      expect(draft.photos).toHaveLength(0)
      expect(revoke).toHaveBeenCalledTimes(2)
    })
  })

  it('removePhoto removes the photo and frees its URL', async () => {
    const { draft, addPhotos, removePhoto } = useNewPattern()
    await addPhotos([file('a.jpg'), file('b.jpg')])

    removePhoto(draft.photos[0]!.id)

    expect(draft.photos.map((p) => p.url)).toEqual(['blob:b.jpg'])
    expect(revoke).toHaveBeenCalledWith('blob:a.jpg')
  })

  describe('generatePieces', () => {
    it('creates one rectangle piece per photo in mm', async () => {
      const { draft, addPhotos, generatePieces } = useNewPattern()
      await addPhotos([file('a.jpg'), file('b.jpg')])

      generatePieces()

      expect(draft.pieces).toHaveLength(2)
      expect(draft.pieces[0]).toMatchObject({
        photoId: draft.photos[0]!.id,
        grainline: 0,
        normal: 1,
        mirrored: 0,
        points: [
          { x: 0, y: 0 },
          { x: 950, y: 0 },
          { x: 950, y: 1425 },
          { x: 0, y: 1425 },
        ],
      })
    })

    it('keeps user edits when nothing changed', async () => {
      const { draft, addPhotos, generatePieces } = useNewPattern()
      await addPhotos([file('a.jpg')])
      generatePieces()
      draft.pieces[0]!.normal = 3

      generatePieces()

      expect(draft.pieces[0]!.normal).toBe(3)
    })

    it('rebuilds the pieces when the scale changes', async () => {
      const { draft, addPhotos, generatePieces } = useNewPattern()
      await addPhotos([file('a.jpg')])
      generatePieces()
      draft.pieces[0]!.normal = 3

      draft.photos[0]!.widthCm = 50
      generatePieces()

      expect(draft.pieces[0]!.normal).toBe(1)
      expect(draft.pieces[0]!.points[1]).toEqual({ x: 500, y: 0 })
    })
  })

  it('removePiece removes only that piece', async () => {
    const { draft, addPhotos, generatePieces, removePiece } = useNewPattern()
    await addPhotos([file('a.jpg'), file('b.jpg')])
    generatePieces()

    removePiece(draft.pieces[0]!.id)

    expect(draft.pieces).toHaveLength(1)
  })

  it('toPayload builds the request body', async () => {
    const { draft, addPhotos, generatePieces, toPayload } = useNewPattern()
    await addPhotos([file('a.jpg')])
    generatePieces()
    Object.assign(draft.details, {
      name: '  Flowy shirt  ',
      size: 'M',
      description: '   ',
      tags: ['summer'],
      visibility: 'PRIVATE',
    })
    draft.pieces[0]!.grainline = 90
    draft.pieces[0]!.mirrored = 2

    const payload = toPayload()

    expect(payload).toMatchObject({
      name: 'Flowy shirt',
      size: 'M',
      description: undefined,
      tags: ['summer'],
      visibility: 'PRIVATE',
    })
    expect(payload.pieces).toHaveLength(1)
    expect(payload.pieces[0]).toMatchObject({ grainline: 90, normal: 1, mirrored: 2 })
    expect(payload.pieces[0]).not.toHaveProperty('id')
  })

  it('hasData reflects entered data and reset clears everything', async () => {
    const { draft, hasData, addPhotos, reset } = useNewPattern()
    expect(hasData.value).toBe(false)

    await addPhotos([file('a.jpg')])
    expect(hasData.value).toBe(true)

    reset()
    expect(hasData.value).toBe(false)
    expect(draft.photos).toHaveLength(0)
    expect(draft.details.visibility).toBe('PUBLIC')
  })
})