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
  defineProps<{ open: boolean; title: string; description: string; buttonLabel?: string }>(),
  { buttonLabel: 'Got it' },
)

const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="p-7 sm:p-8 rounded-mm bg-background text-foreground shadow-2xl">
      <DialogHeader class="text-left">
        <DialogTitle class="text-xl sm:text-2xl font-bold font-inter">{{ title }}</DialogTitle>
        <DialogDescription class="text-xs sm:text-sm text-brand-grey-foreground">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <Button
        type="button"
        class="mt-2 w-full h-10 rounded-lg font-semibold bg-zinc-950 text-white hover:bg-zinc-800"
        @click="emit('update:open', false)"
      >
        {{ buttonLabel }}
      </Button>
    </DialogContent>
  </Dialog>
</template>