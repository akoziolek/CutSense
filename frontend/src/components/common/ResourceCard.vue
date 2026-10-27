<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { Heart, ImageOff } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

defineProps<{
  to: RouteLocationRaw
  title: string
  meta: string
  imageUrl?: string
  isFavourite: boolean
}>()
</script>

<template>
  <RouterLink :to="to" class="group block rounded-xl focus-visible:outline-none">
    <Card
      class="gap-2 px-4 py-4 bg-[var(--card-fabrics)] border-muted shadow-md transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring"
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

        <span
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
  </RouterLink>
</template>