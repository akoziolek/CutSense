import { ref, watch, type Ref } from 'vue'

export function useFormDraft<T extends object>(storageKey: Ref<string> | string) {
  const isDirty = ref(false)

  const getKey = () => (typeof storageKey === 'string' ? storageKey : storageKey.value)

  const loadDraft = (): T | null => {
    const saved = localStorage.getItem(getKey())
    if (!saved) return null
    try {
      const parsed = JSON.parse(saved) as T
      isDirty.value = true
      return parsed
    } catch {
      localStorage.removeItem(getKey())
      return null
    }
  }

  const saveDraft = (payload: Partial<T>) => {
    isDirty.value = true
    localStorage.setItem(getKey(), JSON.stringify(payload))
  }

  const clearDraft = () => {
    isDirty.value = false
    localStorage.removeItem(getKey())
  }

  return {
    isDirty,
    loadDraft,
    saveDraft,
    clearDraft,
  }
}
