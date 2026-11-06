<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
  isFavourite: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'toggle'): void }>()
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="h-9 w-9 border-2 hover:bg-brand-pink cursor-pointer"
    :aria-label="$t(isFavourite ? 'common.actions.favouriteRemove' : 'common.actions.favouriteAdd')"
    :aria-pressed="isFavourite"
    :disabled="disabled"
    @click="emit('toggle')"
  >
    <Heart class="size-6" :stroke-width="2" :class="{ 'fill-current': isFavourite }" />
  </Button>
</template>