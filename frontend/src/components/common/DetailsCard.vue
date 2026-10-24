<script setup lang="ts">
import { type Component } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import TagsList from '../common/TagsList.vue'
import { FileText } from 'lucide-vue-next'
import type { FabricTag } from '@/types/fabric'

export interface MetaItem {
  icon?: Component
  label?: string
  value?: string
}

withDefaults(
  defineProps<{
    metaItems?: MetaItem[]
    tags?: FabricTag[]
    description?: string
  }>(),
  {
    metaItems: () => [],
    tags: () => [],
  },
)
</script>

<template>
  <Card class="overflow-hidden border border-muted shadow-sm rounded-md gap-0 py-0">
    <div
      v-if="metaItems.length || $slots.header"
      class="bg-brand-green px-5 py-3 sm:py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground"
    >
      <slot name="header">
        <div v-for="(item, index) in metaItems" :key="index" class="flex items-center gap-2">
          <component :is="item.icon" v-if="item.icon" class="h-4 w-4 shrink-0" />
          <span>
            <strong v-if="item.label" class="font-bold font-inter"
              >{{ item.label }}
              <span v-if="item.value">:</span>
            </strong>
            {{ item.value }}
          </span>
        </div>
      </slot>
    </div>

    <CardContent class="px-5 py-4 space-y-4 sm:space-y-5 bg-card">
      <slot>
        <TagsList :tags="tags" />

        <div class="space-y-1.5">
          <h3 class="font-semibold font-inter text-base text-foreground tracking-tight">
            Description
          </h3>
          <div v-if="description" class="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
            {{ description }}
          </div>
          <div
            v-else
            class="bg-white text-xs sm:text-sm border border-muted rounded-md p-3 text-center"
          >
            <p class="text-muted-foreground">
              <FileText
                class="inline-block h-4 w-4 align-text-center mr-1.5 text-foreground"
              />
              <strong class="text-foreground">No description yet.</strong> Add fabric details or
              instructions.
            </p>
          </div>
        </div>
      </slot>
    </CardContent>
  </Card>
</template>
