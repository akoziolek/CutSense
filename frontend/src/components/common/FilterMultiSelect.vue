<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ChevronDown, Search, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { FilterOption } from '@/utils/listFilters'

const props = defineProps<{
  options: FilterOption[]
  loading?: boolean
  error?: string
  placeholder?: string
}>()
const selected = defineModel<number[]>({ required: true })

const { t } = useI18n()

const query = ref('')
const isOpen = ref(false)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.options.filter((o) => o.name.toLowerCase().includes(q))
})
const selectedOptions = computed(() => props.options.filter((o) => selected.value.includes(o.id)))
const showList = computed(() => isOpen.value || query.value.trim() !== '')

const toggle = (id: number) => {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id]
}
const onFocusOut = (e: FocusEvent) => {
  const next = e.relatedTarget as Node | null
  if (!next || !(e.currentTarget as HTMLElement).contains(next)) isOpen.value = false
}
</script>

<template>
  <div class="space-y-2">
    <div v-if="selectedOptions.length" class="flex flex-wrap gap-1.5">
      <Badge
        v-for="option in selectedOptions"
        :key="option.id"
        variant="secondary"
        class="gap-1 rounded-md bg-brand-grey text-xs font-normal"
      >
        {{ option.name }}
        <button
          type="button"
          class="cursor-pointer"
          :aria-label="t('common.filters.removeOption', { name: option.name })"
          @click="toggle(option.id)"
        >
          <X class="size-3" />
        </button>
      </Badge>
    </div>

    <div @focusin="isOpen = true" @focusout="onFocusOut">
      <div class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="query" :placeholder="placeholder" class="h-8 pl-8 pr-14 text-xs" data-testid="tag-search" />
        <div class="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          <button
            v-if="query"
            type="button"
            class="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
            :aria-label="t('common.actions.clearSearch')"
            @click="query = ''"
          >
            <X class="size-3.5" />
          </button>
          <ChevronDown
            class="pointer-events-none size-3.5 text-muted-foreground transition-transform"
            :class="{ 'rotate-180': showList }"
          />
        </div>
      </div>

      <p v-if="error" class="mt-1 text-xs text-destructive" role="alert">{{ error }}</p>

      <ul
        v-if="showList"
        class="mt-1 max-h-32 overflow-y-auto rounded-md border border-border bg-popover"
        data-testid="tag-list"
      >
        <li v-for="option in visible" :key="option.id">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-brand-green"
            :class="{ 'bg-brand-green': selected.includes(option.id) }"
            :aria-pressed="selected.includes(option.id)"
            data-testid="tag-option"
            @mousedown.prevent
            @click="toggle(option.id)"
          >
            <span class="truncate">{{ option.name }}</span>
            <span class="flex shrink-0 items-center gap-1.5">
              <span v-if="option.count !== undefined" class="text-muted-foreground">({{ option.count }})</span>
              <Check v-if="selected.includes(option.id)" class="size-3.5" />
            </span>
          </button>
        </li>
        <li v-if="loading" class="px-3 py-2 text-xs text-muted-foreground">
          {{ t('common.filters.loadingOptions') }}
        </li>
        <li v-else-if="!visible.length" class="px-3 py-2 text-xs text-muted-foreground">
          {{ t('common.filters.noMatchingOptions') }}
        </li>
      </ul>
    </div>
  </div>
</template>