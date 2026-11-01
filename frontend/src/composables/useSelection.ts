import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'

// selection mode of a card list; clicks outside the content and Esc leave it
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
    // deselecting the last card ends selection mode, so cards open their details again
    if (selectedIds.value.length === 0) selectionMode.value = false
  }

  // long press and right click: enter selection mode and select
  const selectFromGesture = (id: number) => {
    selectionMode.value = true
    if (!isSelected(id)) toggleSelect(id)
  }

  // dialogs are portaled and the floating buttons are outside the content container
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