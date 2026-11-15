import { ref } from 'vue'

export interface SpatialHistoryAction {
  undo: () => void
  redo: () => void
}

export function useSpatialHistory() {
  const history = ref<SpatialHistoryAction[]>([])
  const historyIndex = ref(0)

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

  return {
    recordAction,
    undo,
    redo,
  }
}
