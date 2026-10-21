<script setup lang="ts" generic="T extends string">
import { ArrowDownAZ, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

defineProps<{ options: { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <DropdownMenu :modal="false">
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="gap-2 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
      >
        <ArrowDownAZ class="size-4" />
        Sort
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-48 p-0 overflow-hidden border-2">
      <DropdownMenuItem
        v-for="option in options"
        :key="option.value"
        class="cursor-pointer rounded-none px-4 py-2 justify-between focus:bg-brand-green"
        :class="{ 'bg-brand-green': option.value === model }"
        @select="model = option.value"
      >
        {{ option.label }}
        <Check v-if="option.value === model" class="size-4" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>