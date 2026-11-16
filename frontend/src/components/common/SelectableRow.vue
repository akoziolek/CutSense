<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { TableRow } from '@/components/ui/table'

const props = defineProps<{
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleSelect'): void
  (e: 'longPress'): void
}>()

const LONG_PRESS_MS = 500

let pressTimer: ReturnType<typeof setTimeout> | null = null
let suppressNextClick = false

const cancelPress = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const startPress = (e: PointerEvent) => {
  suppressNextClick = false
  cancelPress()
  if ((e.target as HTMLElement).closest('button')) return
  if (e.pointerType === 'mouse' && e.button !== 0) return

  pressTimer = setTimeout(() => {
    pressTimer = null
    suppressNextClick = true
    emit('longPress')
  }, LONG_PRESS_MS)
}

const onClickCapture = (e: MouseEvent) => {
  if (suppressNextClick) {
    suppressNextClick = false
    e.preventDefault()
    e.stopImmediatePropagation()
    return
  }
  if (!props.selectable) return
  e.preventDefault()
  e.stopImmediatePropagation()
  emit('toggleSelect')
}

const onKeydown = (e: KeyboardEvent) => {
  if (!props.selectable) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('toggleSelect')
  }
}

onBeforeUnmount(cancelPress)
</script>

<template>
  <TableRow
    data-resource-card
    class="select-none"
    :class="selected ? 'bg-brand-violet/40 hover:bg-brand-violet/40' : 'bg-brand-grey/60'"
    :role="selectable ? 'button' : undefined"
    :tabindex="selectable ? 0 : undefined"
    :aria-pressed="selectable ? (selected ?? false) : undefined"
    @pointerdown="startPress"
    @pointerup="cancelPress"
    @pointerleave="cancelPress"
    @pointercancel="cancelPress"
    @click.capture="onClickCapture"
    @keydown="onKeydown"
  >
    <slot />
  </TableRow>
</template>