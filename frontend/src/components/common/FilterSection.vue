<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

withDefaults(defineProps<{ title: string; defaultOpen?: boolean }>(), { defaultOpen: true })
</script>

<template>
  <Collapsible :default-open="defaultOpen" class="border-t border-border/60 px-4 py-3">
    <CollapsibleTrigger
      class="group flex w-full cursor-pointer items-center gap-1.5 text-sm font-semibold font-inter"
    >
      <ChevronDown class="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
      {{ title }}
    </CollapsibleTrigger>
    <CollapsibleContent class="pt-2"><slot /></CollapsibleContent>
  </Collapsible>
</template>