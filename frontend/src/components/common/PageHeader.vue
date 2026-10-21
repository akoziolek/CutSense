<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import TextHighlight from './TextHighlight.vue'

interface Props {
  title?: string
  description?: string
  color?: string
  fullWidth?: boolean
  backTo?: RouteLocationRaw
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  color: 'var(--brand-violet)',
  fullWidth: true,
  showBack: false,
})

const emit = defineEmits<{
  (e: 'back', event: MouseEvent): void
}>()

const router = useRouter()
const slots = useSlots()
const hasDescription = computed(() => !!(props.description || slots.description))

const handleBack = (event: MouseEvent) => {
  emit('back', event)
  if (!props.backTo) {
    router.back()
  }
}
</script>

<template>
  <header
    :class="['w-full flex items-center justify-between gap-4', hasDescription ? 'pb-0' : 'pb-2']"
  >
    <Button
      v-if="props.showBack"
      as-child
      variant="ghost"
      size="icon"
      class="shrink-0 rounded-md bg-white border-2 cursor-pointer hover:bg-card mt-1"
      aria-label="Go back"
    >
      <component
        :is="props.backTo ? RouterLink : 'button'"
        v-bind="props.backTo ? { to: props.backTo } : { type: 'button' }"
        @click="handleBack"
      >
        <ArrowLeft class="h-8 w-8"  :stroke-width="2" />
      </component>
    </Button>

    <h1 class="text-3xl font-bold tracking-tight flex-1 w-full text-left">
      <TextHighlight :full-width="fullWidth" :color="color">
        <slot>{{ title }}</slot>
      </TextHighlight>
    </h1>

    <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
  <div>
    <p v-if="description || $slots.description" class="text-sm px-3 text-muted-foreground pb-2">
      <slot name="description">{{ description }}</slot>
    </p>
  </div>
</template>
