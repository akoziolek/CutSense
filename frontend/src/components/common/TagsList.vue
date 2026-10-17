<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<{
  tags: string[]
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <h3 class="font-semibold font-inter text-inter text-foreground tracking-tight">Tags</h3>
    <div class="flex flex-wrap gap-2">
      <Badge
        v-for="tag in tags"
        :key="tag"
        variant="secondary"
        class="rounded-md px-2.5 py-0.5 text-xs font-inter bg-brand-grey hover:shadow-xs border-muted text-foreground"
      >
        {{ tag }}
      </Badge>
    </div>
  </div>
</template>
