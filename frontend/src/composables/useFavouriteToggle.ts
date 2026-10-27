import { reactive } from 'vue'
import { toast } from 'vue-sonner'
import { api, ApiError } from '@/api/client'

export function useFavouriteToggle() {
  const pending = reactive(new Set<number>())

  async function toggle(target: { id: number; isFavourite: boolean }) {
    if (pending.has(target.id)) return

    const next = !target.isFavourite
    target.isFavourite = next
    pending.add(target.id)

    try {
      await api(`/fabrics/${target.id}/favourite`, {
        method: 'PATCH',
        body: JSON.stringify({ isFavourite: next }),
      })
    } catch (e) {
      target.isFavourite = !next
      toast.error(next ? 'Could not add to favourites' : 'Could not remove from favourites', {
        description: e instanceof ApiError ? e.body.message : 'Please try again.',
      })
    } finally {
      pending.delete(target.id)
    }
  }

  return { toggle, pending }
}