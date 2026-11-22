import { computed, ref } from 'vue'

export interface SpatialHistoryAction {
  undo: () => void
  redo: () => void
}

export function useSpatialHistory() {
  const history = ref<SpatialHistoryAction[]>([])
  const historyIndex = ref(0)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length)

  const recordAction = (action: SpatialHistoryAction) => {
    if (historyIndex.value < history.value.length) {
      history.value = history.value.slice(0, historyIndex.value)
    }
    history.value.push(action)
    historyIndex.value = history.value.length
  }

  const undo = (): boolean => {
    if (historyIndex.value === 0) return false
    historyIndex.value--
    history.value[historyIndex.value]!.undo()
    return true
  }

  const redo = (): boolean => {
    if (historyIndex.value >= history.value.length) return false
    history.value[historyIndex.value]!.redo()
    historyIndex.value++
    return true
  }

  const clear = () => {
    history.value = []
    historyIndex.value = 0
  }

  return {
    canUndo,
    canRedo,
    recordAction,
    undo,
    redo,
    clear,
  }
}
