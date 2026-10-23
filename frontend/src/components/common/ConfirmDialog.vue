<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
    error?: string
  }>(),
  { confirmLabel: 'Confirm', cancelLabel: 'Cancel', loading: false, error: '' },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'confirm'): void }>()
</script>

<template>
  <Dialog :open="open" @update:open="(v) => !loading && emit('update:open', v)">
    <DialogContent class="p-7 sm:p-8 rounded-mm bg-background text-foreground shadow-2xl">
      <DialogHeader class="text-left">
        <DialogTitle class="text-xl sm:text-2xl font-bold font-inter">{{ title }}</DialogTitle>
        <DialogDescription class="text-xs sm:text-sm text-brand-grey-foreground">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <p v-if="error" class="text-sm font-semibold text-destructive" role="alert">{{ error }}</p>

      <div class="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          class="h-9 rounded-lg text-xs sm:text-sm font-semibold border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          :disabled="loading"
          @click="emit('update:open', false)"
        >
          {{ cancelLabel }}
        </Button>
        <Button
          type="button"
          class="h-9 rounded-lg text-xs sm:text-sm font-semibold bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-60"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>