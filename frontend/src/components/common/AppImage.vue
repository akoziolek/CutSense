<script setup lang="ts">
import { ref, watch } from 'vue'
import { ImageOff } from 'lucide-vue-next'

type ObjectFitClass =
  | 'object-cover'
  | 'object-contain'
  | 'object-fill'
  | 'object-none'
  | 'object-scale-down'

const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    showMessage?: boolean
    pictureFit?: ObjectFitClass
  }>(),
  {
    showMessage: true,
    pictureFit: 'object-cover',
  },
)

const emit = defineEmits<{ (e: 'error'): void }>()
const hasError = ref(false)

watch(
  () => props.src,
  (newSrc) => {
    hasError.value = !newSrc
  },
  { immediate: true },
)

const handleError = () => {
  hasError.value = true
  emit('error')
}
</script>

<template>
  <img
    v-if="src && !hasError"
    :src="src"
    :alt="alt || ''"
    draggable="false"
    class="w-full h-full block"
    :class="pictureFit"
    @error="handleError"
  />

  <div
    v-else
    class="flex flex-col items-center justify-center text-center text-muted-foreground w-full h-full bg-muted p-4"
  >
    <ImageOff class="size-12 text-muted-foreground shrink-0 mb-2" />
    <span v-if="showMessage" class="max-w-xs text-xs">
      Image temporarily unavailable
    </span>
  </div>
</template>