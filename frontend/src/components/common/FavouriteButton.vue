<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  isFavourite: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'toggle'): void }>()

const handleClick = () => {
  if (!props.disabled) {
    emit('toggle')
  }
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="h-9 w-9 border-2 hover:bg-brand-pink! hover:text-brand-pink-foreground cursor-pointer"
    :aria-label="$t(isFavourite ? 'common.actions.favouriteRemove' : 'common.actions.favouriteAdd')"
    :aria-pressed="isFavourite"
    :aria-disabled="disabled"
    @click="handleClick"
  >
    <Heart class="size-6" :stroke-width="2" :class="{ 'fill-current': isFavourite }" />
  </Button>
</template>
