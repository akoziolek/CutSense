<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ArrowRight, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    cancelTo?: RouteLocationRaw
    nextTo?: RouteLocationRaw
    cancelLabel?: string
    nextLabel?: string
    disabled?: boolean
    showCancel?: boolean
    showNext?: boolean
  }>(),
  {
    cancelLabel: 'Cancel',
    nextLabel: 'Next',
    disabled: false,
    showCancel: true,
    showNext: true,
  },
)

const emit = defineEmits<{
  (e: 'cancel', event: MouseEvent): void
  (e: 'next', event: MouseEvent): void
}>()

const handleCancel = (event: MouseEvent) => {
  emit('cancel', event)
}

const handleNext = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('next', event)
}
</script>

<template>
  <div
    class="fixed bottom-14 right-8 sm:bottom-16 sm:right-14 z-50 flex items-center gap-3 transition-all duration-200"
  >
    <Button
      v-if="props.showCancel"
      as-child
      variant="ghost"
      class="border-2 !border-warning-foreground !bg-warning !text-warning-foreground px-5 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
    >
      <component
        :is="props.cancelTo ? RouterLink : 'button'"
        v-bind="props.cancelTo ? { to: props.cancelTo } : { type: 'button' }"
        @click="handleCancel"
      >
        <X v-if="!props.cancelTo" class="w-4 h-4 mr-2 stroke-[2.5]" />
        {{ props.cancelLabel }}
      </component>
    </Button>

    <Button
      v-if="props.showNext"
      as-child
      variant="default"
      class="px-6 rounded-md font-semibold font-inter shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
      :disabled="props.disabled"
    >
      <component
        :is="props.nextTo ? RouterLink : 'button'"
        v-bind="props.nextTo ? { to: props.nextTo } : { type: 'button' }"
        @click="handleNext"
      >
        {{ props.nextLabel }}
        <ArrowRight class="w-4 h-4 ml-2 stroke-[2.5]" />
      </component>
    </Button>
  </div>
</template>