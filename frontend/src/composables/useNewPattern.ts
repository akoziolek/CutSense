import { computed, reactive } from 'vue'

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const NAME_MAX = 35
export const DESC_MAX = 400
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
// TODO: load from the API once the tags endpoint exists
export const TAG_OPTIONS = [
  'winter', 'spring', 'summer', 'autumn', 'dresses', 'skirts',
  'trousers', 'blouses', 'shirts', 'outerwear', 'undergarments', 'accessories',
]

export interface Photo {
  id: number
  file: File
  url: string
  ratio: number // height / width
  widthCm: number // real width of the photo, set in the scale step
}

export interface DetectedPiece {
  id: number
  photoId: number
  points: { x: number; y: number }[]
  grainline: number
  normal: number
  mirrored: number
}

interface Draft {
  photos: Photo[]
  pieces: DetectedPiece[]
  piecesFor: string
  details: {
    name: string
    size: (typeof SIZES)[number] | ''
    description: string
    tags: string[]
    visibility: 'PUBLIC' | 'PRIVATE'
  }
}

const emptyDraft = (): Draft => ({
  photos: [],
  pieces: [],
  piecesFor: '',
  details: { name: '', size: '', description: '', tags: [], visibility: 'PUBLIC' },
})

const draft = reactive<Draft>(emptyDraft())
let nextId = 1

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = url
  })

const LOAD_ERROR =
  "We couldn't process this file. Please make sure you're uploading a clear, well-lit photo of a pattern and try again."

export function useNewPattern() {
  // aif any file is invalid, none is added
  async function addPhotos(files: File[]) {
    if (files.some((f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE)) {
      throw new Error(LOAD_ERROR)
    }
    const urls = files.map((f) => URL.createObjectURL(f))
    try {
      const images = await Promise.all(urls.map(loadImage))
      files.forEach((file, i) => {
        const url = urls[i]
        const image = images[i]
        if (!url || !image) return
        draft.photos.push({
          id: nextId++,
          file,
          url,
          ratio: image.naturalHeight / image.naturalWidth,
          widthCm: 95,
        })
      })
    } catch {
      urls.forEach((u) => URL.revokeObjectURL(u))
      throw new Error(LOAD_ERROR)
    }
  }

  function removePhoto(id: number) {
    const photo = draft.photos.find((p) => p.id === id)
    if (photo) URL.revokeObjectURL(photo.url)
    draft.photos = draft.photos.filter((p) => p.id !== id)
  }

  const rect = (w: number, h: number) => [
    { x: 0, y: 0 },
    { x: Math.round(w), y: 0 },
    { x: Math.round(w), y: Math.round(h) },
    { x: 0, y: Math.round(h) },
  ]

  // TODO: replace with shapes-engine. Placeholder: one rectangle per photo, in mm,

  function generatePieces() {
    const signature = draft.photos.map((p) => `${p.id}:${p.widthCm}`).join(',')
    if (signature === draft.piecesFor) return
    draft.pieces = draft.photos.map((p) => {
      const w = p.widthCm * 10
      const h = w * p.ratio
      return {
        id: nextId++,
        photoId: p.id,
        points: rect(w, h),
        grainline: 0,
        normal: 1,
        mirrored: 0,
      }
    })
    draft.piecesFor = signature
  }

  function removePiece(id: number) {
    draft.pieces = draft.pieces.filter((p) => p.id !== id)
  }

  function reset() {
    draft.photos.forEach((p) => URL.revokeObjectURL(p.url))
    Object.assign(draft, emptyDraft())
  }

  const hasData = computed(
    () =>
      draft.photos.length > 0 ||
      !!draft.details.name ||
      !!draft.details.description ||
      draft.details.tags.length > 0,
  )

  function toPayload() {
    const d = draft.details
    return {
      name: d.name.trim(),
      size: d.size,
      description: d.description.trim() || undefined,
      visibility: d.visibility,
      tags: d.tags,
      pieces: draft.pieces.map((p) => ({
        points: p.points,
        grainline: p.grainline,
        normal: p.normal,
        mirrored: p.mirrored,
      })),
    }
  }

  return { draft, hasData, addPhotos, removePhoto, generatePieces, removePiece, reset, toPayload }
}