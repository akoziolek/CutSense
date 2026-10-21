<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart, ImageOff } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import type { FabricListItem } from '@/types/fabric'

const props = defineProps<{ fabric: FabricListItem }>()

const meta = computed(() => {
  const date = new Date(props.fabric.createdAt).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return `${date} • ${props.fabric.area.toFixed(1)} m²`
})
</script>

<template>
  <RouterLink
    :to="{ name: 'fabric-details', params: { id: fabric.id } }"
    class="group block rounded-xl focus-visible:outline-none"
  >
    <Card
      class="gap-2 px-3 py-3 border-muted shadow-md transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring"
    >
      <div class="relative aspect-square overflow-hidden rounded-md bg-muted">
        <img
          v-if="fabric.pictureUrl"
          :src="fabric.pictureUrl"
          :alt="fabric.name"
          loading="lazy"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full items-center justify-center text-muted-foreground">
          <ImageOff class="size-8" />
        </div>

        <span
          class="absolute right-2 top-2 rounded-md bg-background p-1 shadow-sm"
          :aria-label="fabric.isFavourite ? 'Favourite' : 'Not favourite'"
        >
          <Heart class="size-4" :class="{ 'fill-current': fabric.isFavourite }" />
        </span>
      </div>

      <div class="space-y-0.5">
        <h3 class="truncate text-sm font-bold font-inter text-foreground">{{ fabric.name }}</h3>
        <p class="text-xs text-muted-foreground">{{ meta }}</p>
      </div>
    </Card>
  </RouterLink>
</template>