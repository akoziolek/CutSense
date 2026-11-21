import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useSelection(contentRef: Ref<HTMLElement | null>) {
  const selectionMode = ref(false)
  const selectedIds = ref<number[]>([])
  const selectedCount = computed(() => selectedIds.value.length)
  const isSelected = (id: number) => selectedIds.value.includes(id)

  const stopSelecting = () => {
    selectionMode.value = false
    selectedIds.value = []
  }

  const toggleSelect = (id: number) => {
    selectedIds.value = isSelected(id)
      ? selectedIds.value.filter((x) => x !== id)
      : [...selectedIds.value, id]
    if (selectedIds.value.length === 0) selectionMode.value = false
  }

  const selectFromGesture = (id: number) => {
    selectionMode.value = true
    if (!isSelected(id)) toggleSelect(id)
  }

  const onClick = (e: MouseEvent) => {
    if (!selectionMode.value) return
    const target = e.target as HTMLElement
    if (!contentRef.value?.contains(target)) return
    if (target.closest('[data-resource-card]')) return
    stopSelecting()
  }
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionMode.value) stopSelecting()
  }

  onMounted(() => {
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKeydown)
  })
  onUnmounted(() => {
    window.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKeydown)
  })

  return { selectionMode, selectedIds, selectedCount, isSelected, toggleSelect, selectFromGesture, stopSelecting }
}