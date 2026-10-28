<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Tag } from 'lucide-vue-next'
import type { NameTag } from '@/types/fabric'

defineProps<{
  tags: NameTag[]
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <h3 class="font-semibold font-inter text-inter text-foreground tracking-tight">Tags</h3>
    <div v-if="tags && tags.length > 0" class="flex flex-wrap gap-2">
      <Badge
        v-for="tag in tags"
        :key="tag.id"
        variant="secondary"
        class="rounded-md px-2.5 py-0.5 text-xs font-inter bg-brand-grey hover:shadow-xs border-muted text-foreground"
      >
        {{ tag.name }}
      </Badge>
    </div>
    <div v-else class="bg-white text-xs sm:text-sm border border-muted rounded-md p-3 text-center">
      <p class="text-muted-foreground">
        <Tag class="inline-block h-4 w-4 align-text-center mr-1.5 text-foreground" />
        <strong class="text-foreground">No tags yet.</strong> Add them to make filtering easier.
      </p>
    </div>
  </div>
</template>
