<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ListFilter, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { FabricTag } from '@/types/fabric'
import { emptyFilters, type FabricFilters } from '@/utils/fabricFilters'

const props = defineProps<{
  modelValue: FabricFilters
  tags: FabricTag[]
  tagsError?: string
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', filters: FabricFilters): void
  (e: 'opened'): void
}>()

const clone = (f: FabricFilters): FabricFilters => ({ ...f, tagIds: [...f.tagIds] })

const isOpen = ref(false)
const draft = ref<FabricFilters>(clone(props.modelValue))
const tagQuery = ref('')

watch(isOpen, (open) => {
  if (!open) return
  draft.value = clone(props.modelValue)
  tagQuery.value = ''
  emit('opened')
})

const visibleTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  return props.tags.filter((t) => t.name.toLowerCase().includes(q))
})
const selectedTags = computed(() => props.tags.filter((t) => draft.value.tagIds.includes(t.id)))

const toggleTag = (id: number) => {
  const ids = draft.value.tagIds
  draft.value.tagIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

const rangeError = computed(() => {
  const { createdFrom, createdTo, areaMin, areaMax } = draft.value
  if (createdFrom && createdTo && createdFrom > createdTo)
    return 'The start date must not be later than the end date.'
  if (areaMin !== '' && areaMax !== '' && Number(areaMin) > Number(areaMax))
    return 'The minimum area must not be greater than the maximum.'
  return ''
})

const clear = () => {
  draft.value = emptyFilters()
  tagQuery.value = ''
}

const apply = () => {
  if (rangeError.value) return
  emit('apply', clone(draft.value))
  isOpen.value = false
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="gap-2 hover:bg-brand-pink data-[state=open]:bg-brand-pink"
        :class="{ 'bg-brand-pink': active }"
        data-testid="filter-trigger"
      >
        <ListFilter class="size-4" />
        Filter
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-80 space-y-4 p-4">
      <section class="space-y-1.5">
        <h3 class="text-sm font-semibold font-inter">Date added</h3>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-xs">
            <span>From</span>
            <Input v-model="draft.createdFrom" type="date" class="h-8" data-testid="date-from" />
          </label>
          <label class="space-y-1 text-xs">
            <span>To</span>
            <Input v-model="draft.createdTo" type="date" class="h-8" data-testid="date-to" />
          </label>
        </div>
      </section>

      <section class="space-y-1.5">
        <h3 class="text-sm font-semibold font-inter">Area (m²)</h3>
        <div class="grid grid-cols-2 gap-2">
          <Input v-model="draft.areaMin" type="number" min="0" step="0.1" placeholder="Min" class="h-8" data-testid="area-min" />
          <Input v-model="draft.areaMax" type="number" min="0" step="0.1" placeholder="Max" class="h-8" data-testid="area-max" />
        </div>
      </section>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="draft.favouriteOnly" type="checkbox" class="accent-foreground" data-testid="fav-only" />
        Favourites only
      </label>

      <section class="space-y-1.5">
        <h3 class="text-sm font-semibold font-inter">Tags</h3>
        <div v-if="selectedTags.length" class="flex flex-wrap gap-1.5">
          <Badge
            v-for="tag in selectedTags"
            :key="tag.id"
            variant="secondary"
            class="gap-1 rounded-md bg-brand-grey text-xs font-normal"
          >
            {{ tag.name }}
            <button type="button" :aria-label="`Remove ${tag.name}`" @click="toggleTag(tag.id)">
              <X class="size-3" />
            </button>
          </Badge>
        </div>
        <Input v-model="tagQuery" placeholder="Search tags..." class="h-8" data-testid="tag-search" />
        <p v-if="tagsError" class="text-xs text-destructive" role="alert">{{ tagsError }}</p>
        <ul class="max-h-32 overflow-y-auto rounded-md border border-border">
          <li v-for="tag in visibleTags" :key="tag.id">
            <button
              type="button"
              class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-brand-green"
              :class="{ 'bg-brand-green': draft.tagIds.includes(tag.id) }"
              :aria-pressed="draft.tagIds.includes(tag.id)"
              data-testid="tag-option"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </button>
          </li>
          <li v-if="!visibleTags.length" class="px-3 py-2 text-xs text-muted-foreground">
            No matching tags
          </li>
        </ul>
      </section>

      <p v-if="rangeError" class="text-xs text-destructive" role="alert">{{ rangeError }}</p>

      <div class="flex justify-between gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" data-testid="clear" @click="clear">
          Clear filters
        </Button>
        <Button type="button" size="sm" :disabled="!!rangeError" data-testid="apply" @click="apply">
          Apply
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>