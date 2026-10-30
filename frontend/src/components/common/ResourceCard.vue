<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { Heart, ImageOff } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

const props = defineProps<{
  to: RouteLocationRaw
  title: string
  meta: string
  imageUrl?: string
  isFavourite: boolean
  toggleable?: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleFavourite'): void
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
  if (!suppressNextClick) return
  suppressNextClick = false
  e.preventDefault()
  e.stopImmediatePropagation()
}

onBeforeUnmount(cancelPress)

const wrapperProps = computed(() =>
  props.selectable
    ? {
        role: 'button',
        tabindex: 0,
        'aria-pressed': props.selected ?? false,
        onClick: () => emit('toggleSelect'),
        onKeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            emit('toggleSelect')
          }
        },
      }
    : { to: props.to },
)
</script>

<template>
  <component
    :is="selectable ? 'div' : RouterLink"
    v-bind="wrapperProps"
    data-resource-card
    class="group block rounded-xl focus-visible:outline-none select-none"
    :class="{ 'cursor-pointer': selectable }"
    @pointerdown="startPress"
    @pointerup="cancelPress"
    @pointerleave="cancelPress"
    @pointercancel="cancelPress"
    @click.capture="onClickCapture"
  >
    <Card
      class="relative gap-2 px-4 py-4 bg-[var(--card-fabrics)] border-muted shadow-md transition-all duration-200 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring"
      :class="{ 'border-2 !border-primary shadow-lg scale-[1.02]': selected }"
    >
      <div class="relative aspect-square overflow-hidden rounded-md bg-muted">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="title"
          loading="lazy"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <slot name="placeholder"><ImageOff class="size-8" /></slot>
        </div>

        <button
          v-if="toggleable"
          type="button"
          class="absolute right-2 top-2 rounded-md bg-background p-1 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          :aria-label="isFavourite ? 'Remove from favourites' : 'Add to favourites'"
          :aria-pressed="isFavourite"
          @click.prevent.stop="emit('toggleFavourite')"
        >
          <Heart class="size-6" :class="{ 'fill-current': isFavourite }" />
        </button>
        <span
          v-else
          class="absolute right-2 top-2 rounded-md bg-background p-1 shadow-sm"
          :aria-label="isFavourite ? 'Favourite' : 'Not favourite'"
        >
          <Heart class="size-6" :class="{ 'fill-current': isFavourite }" />
        </span>
      </div>

      <div class="space-y-0.5">
        <h3 class="truncate text-sm font-bold font-inter text-foreground">{{ title }}</h3>
        <p class="text-xs text-muted-foreground">{{ meta }}</p>
      </div>
    </Card>
  </component>
</template>