<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open?: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  showCancel?: boolean
  showConfirm?: boolean
  confirmDisabled?: boolean
  confirmLoading?: boolean
  fullWidthButton?: boolean
  preventClose?: boolean
  focusConfirm?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  description: '',
  confirmLabel: '',
  cancelLabel: '',
  confirmVariant: 'default',
  showCancel: false,
  showConfirm: true,
  confirmDisabled: false,
  confirmLoading: false,
  fullWidthButton: false,
  preventClose: false,
  focusConfirm: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', event: MouseEvent | KeyboardEvent): void
  (e: 'cancel', event: MouseEvent): void
}>()

const handlePointerDownOutside = (event: Event) => {
  if (props.preventClose) event.preventDefault()
}

const handleEscapeKeyDown = (event: Event) => {
  if (props.preventClose) event.preventDefault()
}

const handleEnterKeyDown = (e: KeyboardEvent) => {
  if (e.defaultPrevented || e.repeat || e.isComposing) return
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
  if (!props.showConfirm || props.confirmDisabled || props.confirmLoading) return

  const target = e.target instanceof HTMLElement ? e.target : null
  if (
    target?.closest(
      'textarea, select, button, a, [role="button"], [contenteditable="true"], [aria-haspopup]',
    )
  )
    return

  e.preventDefault()
  emit('confirm', e)
}

const handleOpenAutoFocus = (event: Event) => {
  if (!props.focusConfirm) return
  const container = event.target instanceof HTMLElement ? event.target : null
  const el = container?.querySelector<HTMLButtonElement>('[data-modal-confirm]')
  if (!el || el.disabled) return
  event.preventDefault()
  el.focus()
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent
      @pointer-down-outside="handlePointerDownOutside"
      @escape-key-down="handleEscapeKeyDown"
      @open-auto-focus="handleOpenAutoFocus"
      @keydown.enter="handleEnterKeyDown"
      class="p-7 sm:p-8 rounded-xl bg-popover text-foreground shadow-2xl [&>button]:hidden"
    >
      <DialogHeader
        v-if="title || $slots.title || description || $slots.description"
        class="text-left"
      >
        <DialogTitle
          v-if="title || $slots.title"
          class="text-2xl font-bold font-inter tracking-tight"
        >
          <slot name="title">{{ title }}</slot>
        </DialogTitle>
        <DialogDescription
          v-if="description || $slots.description"
          class="text-xs sm:text-sm text-brand-grey-foreground font-normal whitespace-pre-line"
        >
          <slot name="description">{{ description }}</slot>
        </DialogDescription>
      </DialogHeader>

      <div v-if="$slots.default" class="mt-2">
        <slot />
      </div>

      <div v-if="$slots.footer" class="mt-4">
        <slot name="footer" />
      </div>

      <div
        v-else-if="showConfirm || showCancel"
        :class="[
          'mt-4 flex gap-2',
          fullWidthButton || !showCancel ? 'flex-col' : 'items-center justify-end',
        ]"
      >
        <Button
          v-if="showCancel"
          type="button"
          variant="ghost"
          :disabled="confirmLoading"
          class="h-9 rounded-md px-4 text-xs sm:text-sm font-semibold font-inter hover:bg-brand-green hover:text-brand-green-foreground transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          @click="(e: MouseEvent) => emit('cancel', e)"
        >
          <slot name="cancel-icon" />
          <slot name="cancel-label">{{ cancelLabel || $t('common.actions.cancel') }}</slot>
        </Button>

        <Button
          v-if="showConfirm"
          data-modal-confirm
          type="button"
          variant="ghost"
          :disabled="confirmDisabled || confirmLoading"
          :class="[
            'h-9 rounded-md text-xs sm:text-sm font-semibold font-inter inline-flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
            fullWidthButton || !showCancel ? 'w-full' : 'px-5',
            confirmVariant === 'destructive'
              ? 'border-2 !border-warning-foreground !bg-warning !text-warning-foreground'
              : '!bg-zinc-950 !text-white hover:!bg-zinc-800 disabled:!bg-zinc-300',
          ]"
          @click="(e: MouseEvent) => emit('confirm', e)"
        >
          <slot name="confirm-label">{{ confirmLabel || $t('common.actions.confirm') }}</slot>
          <slot name="confirm-icon" />
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
