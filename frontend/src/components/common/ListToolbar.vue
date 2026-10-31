<script setup lang="ts" generic="S extends string">
import { Search, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import SortMenu from '@/components/common/SortMenu.vue'

defineProps<{
  placeholder: string
  ariaLabel: string
  sortOptions: { value: S; label: string }[]
  maxlength?: number
}>()
const search = defineModel<string>('search', { required: true })
const sort = defineModel<S>('sort', { required: true })
const emit = defineEmits<{ (e: 'submit'): void; (e: 'clear'): void }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative flex-1 min-w-48">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="search"
        type="text"
        autocomplete="off"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        class="h-9 pl-9 pr-9"
        @keydown.enter="emit('submit')"
      />
      <button
        v-if="search"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label="Clear search"
        @click="emit('clear')"
      >
        <X class="size-4" />
      </button>
    </div>

    <slot name="filter" />
    <SortMenu v-model="sort" :options="sortOptions" />
  </div>
</template>