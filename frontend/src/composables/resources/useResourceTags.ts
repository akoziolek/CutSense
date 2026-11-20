import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/api/client'
import type { NameTag } from '@/types/common'

export function useResourceTags(
  path: '/fabrics/tags' | '/patterns/tags',
  fallbackErrorKey: string,
) {
  const { t } = useI18n()
  const tags = ref<NameTag[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref('')

  const loadTags = async () => {
    if (loaded.value || loading.value) return
    error.value = ''
    loading.value = true
    try {
      tags.value = await api<NameTag[]>(path)
      loaded.value = true
    } catch (e) {
      error.value = e instanceof ApiError ? e.body.message : t(fallbackErrorKey)
    } finally {
      loading.value = false
    }
  }

  return { tags, loading, error, loadTags }
}
