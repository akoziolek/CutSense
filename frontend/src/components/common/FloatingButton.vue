<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  to?: string | object
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <div class="fixed bottom-12 right-6 sm:bottom-14 md:right-10 z-50">
    <Button
      :as-child="!!props.to"
      class="h-12 w-12 sm:h-14 sm:w-14 rounded-xl p-0 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
      aria-label="Floating action"
      @click="emit('click', $event)"
    >
      <RouterLink v-if="props.to" :to="props.to">
        <Plus class="!h-6 !w-6 sm:!h-7 sm:!w-7 stroke-[2] shrink-0" />
      </RouterLink>

      <Plus v-else class="!h-6 !w-6 sm:!h-7 sm:!w-7 stroke-[2] shrink-0" />
    </Button>
  </div>
</template>
