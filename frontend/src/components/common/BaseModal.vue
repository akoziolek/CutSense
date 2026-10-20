<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// TODO - after PR use only this modal
interface Props {
  open?: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  showConfirm?: boolean
  confirmDisabled?: boolean
  confirmLoading?: boolean
  fullWidthButton?: boolean
  preventClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  showCancel: false,
  showConfirm: true,
  confirmDisabled: false,
  confirmLoading: false,
  fullWidthButton: false,
  preventClose: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', event: MouseEvent): void
  (e: 'cancel', event: MouseEvent): void
}>()

const handlePointerDownOutside = (event: Event) => {
  if (props.preventClose) event.preventDefault()
}

const handleEscapeKeyDown = (event: Event) => {
  if (props.preventClose) event.preventDefault()
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent
      @pointer-down-outside="handlePointerDownOutside"
      @escape-key-down="handleEscapeKeyDown"
      class="p-7 sm:p-8 rounded-xl bg-background text-foreground shadow-2xl [&>button]:hidden"
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
          class="h-9 rounded-lg text-xs sm:text-sm"
          @click="(e: MouseEvent) => emit('cancel', e)"
        >
          <slot name="cancel-icon" />
          <slot name="cancel-label">{{ cancelLabel }}</slot>
        </Button>

        <Button
          v-if="showConfirm"
          type="button"
          :disabled="confirmDisabled || confirmLoading"
          :class="[
            'h-9 rounded-lg text-xs sm:text-sm font-semibold font-inter inline-flex items-center justify-center gap-1.5 transition-all shadow-sm',
            fullWidthButton || !showCancel ? 'w-full' : 'px-4',
            'bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed',
          ]"
          @click="(e: MouseEvent) => emit('confirm', e)"
        >
          <slot name="confirm-label">{{ confirmLabel }}</slot>
          <slot name="confirm-icon" />
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
