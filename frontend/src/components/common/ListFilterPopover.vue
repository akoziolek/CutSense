<script setup lang="ts" generic="F extends BaseFilters">
import { computed, ref, watch, type Ref } from 'vue'
import { Check, ChevronDown, ListFilter, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { NameTag } from '@/types/fabric'
import FilterSection from '@/components/common/FilterSection.vue'
import { type BaseFilters } from '@/utils/listFilters'

const props = withDefaults(
  defineProps<{
    modelValue: F
    emptyFilters: () => F
    tags: NameTag[]
    tagsLoading?: boolean
    tagsError?: string
    active: boolean
    showFavourites?: boolean
    showCommunity?: boolean
    extraError?: (filters: F) => string
  }>(),
  { showFavourites: true,
    showCommunity: false
  },
  
)

const emit = defineEmits<{
  (e: 'apply', filters: F): void
  (e: 'opened'): void
}>()

const clone = (f: F): F => JSON.parse(JSON.stringify(f))
const draft = ref(clone(props.modelValue)) as Ref<F>

const isOpen = ref(false)
const tagQuery = ref('')
const tagsOpen = ref(false)

watch(isOpen, (open) => {
  if (!open) return
  draft.value = clone(props.modelValue)
  tagQuery.value = ''
  tagsOpen.value = false
  emit('opened')
})

const rangeError = computed(() => {
  const { createdFrom, createdTo } = draft.value
  if (createdFrom && createdTo && createdFrom > createdTo)
    return 'The start date must not be later than the end date.'
  return props.extraError?.(draft.value) ?? ''
})

const clearAll = () => {
  draft.value = props.emptyFilters()
  tagQuery.value = ''
}

const visibleTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  return props.tags.filter((t) => t.name.toLowerCase().includes(q))
})

const selectedTags = computed(() => 
  props.tags.filter((t) => draft.value.tagIds.includes(t.id))
)

const showTagList = computed(() => tagsOpen.value || tagQuery.value.trim() !== '')

const toggleTag = (id: number) => {
  const ids = draft.value.tagIds
  draft.value.tagIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

const onTagsFocusOut = (e: FocusEvent) => {
  const next = e.relatedTarget as Node | null
  if (!next || !(e.currentTarget as HTMLElement).contains(next)) tagsOpen.value = false
}

const cancel = () => {
  isOpen.value = false
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

    <PopoverContent align="end" :sideOffset="12" class="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
      <header class="flex items-center justify-between px-4 py-3">
        <h2 class="text-sm font-bold font-inter">Detailed filters</h2>
        <button
          type="button"
          class="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          data-testid="clear"
          @click="clearAll"
        >
          Clear all
        </button>
      </header>

      <div class="max-h-[55vh] overflow-y-auto">
        <!-- Date range section using FilterSection component -->
        <FilterSection title="Date range" :default-open="true">
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1 text-xs">
              <span>From</span>
              <Input
                v-model="draft.createdFrom"
                type="date"
                :max="draft.createdTo || undefined"
                class="h-8 text-xs"
                data-testid="date-from"
              />
            </label>
            <label class="space-y-1 text-xs">
              <span>To</span>
              <Input
                v-model="draft.createdTo"
                type="date"
                :min="draft.createdFrom || undefined"
                class="h-8 text-xs"
                data-testid="date-to"
              />
            </label>
          </div>
        </FilterSection>

        <!-- Only favourites -->
        <div v-if="showFavourites" class="flex items-center justify-between border-t border-border/60 px-4 py-3">
          <Label for="filter-fav-only" class="cursor-pointer text-sm font-semibold font-inter">
            Only favourites
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">{{ draft.favouriteOnly ? 'Yes' : 'No' }}</span>
            <Switch id="filter-fav-only" v-model="draft.favouriteOnly" data-testid="fav-only" />
          </div>
        </div>

        <!-- Only community toggle -->
        <div v-if="showCommunity" class="flex items-center justify-between border-t border-border/60 px-4 py-3">
          <Label for="filter-community" class="cursor-pointer text-sm font-semibold font-inter">
            Community
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">{{ (draft as any).communityOnly ? 'Yes' : 'No' }}</span>
            <Switch id="filter-community" v-model="(draft as any).communityOnly" data-testid="community-only" />
          </div>
        </div>

        <!-- Tags section -->
        <FilterSection title="Tags" :default-open="false">
          <div class="space-y-2">
            <p class="text-xs text-muted-foreground">Items with any of the selected tags.</p>

            <div v-if="selectedTags.length" class="flex flex-wrap gap-1.5">
              <Badge
                v-for="tag in selectedTags"
                :key="tag.id"
                variant="secondary"
                class="gap-1 rounded-md bg-brand-grey text-xs font-normal"
              >
                {{ tag.name }}
                <button
                  type="button"
                  class="cursor-pointer"
                  :aria-label="`Remove ${tag.name}`"
                  @click="toggleTag(tag.id)"
                >
                  <X class="size-3" />
                </button>
              </Badge>
            </div>

            <div @focusin="tagsOpen = true" @focusout="onTagsFocusOut">
              <div class="relative">
                <Search
                  class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  v-model="tagQuery"
                  placeholder="Search tags..."
                  class="h-8 pl-8 pr-14 text-xs"
                  data-testid="tag-search"
                />
                <div class="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                  <button
                    v-if="tagQuery"
                    type="button"
                    class="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear tag search"
                    @click="tagQuery = ''"
                  >
                    <X class="size-3.5" />
                  </button>
                  <ChevronDown
                    class="pointer-events-none size-3.5 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': showTagList }"
                  />
                </div>
              </div>

              <p v-if="tagsError" class="mt-1 text-xs text-destructive" role="alert">
                {{ tagsError }}
              </p>

              <ul
                v-if="showTagList"
                class="mt-1 max-h-32 overflow-y-auto rounded-md border border-border bg-popover"
                data-testid="tag-list"
              >
                <li v-for="tag in visibleTags" :key="tag.id">
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-brand-green"
                    :class="{ 'bg-brand-green': draft.tagIds.includes(tag.id) }"
                    :aria-pressed="draft.tagIds.includes(tag.id)"
                    data-testid="tag-option"
                    @mousedown.prevent
                    @click="toggleTag(tag.id)"
                  >
                    {{ tag.name }}
                    <Check v-if="draft.tagIds.includes(tag.id)" class="size-3.5" />
                  </button>
                </li>
                <li v-if="tagsLoading" class="px-3 py-2 text-xs text-muted-foreground">
                  Loading tags...
                </li>
                <li
                  v-else-if="!visibleTags.length"
                  class="px-3 py-2 text-xs text-muted-foreground"
                >
                  No matching tags
                </li>
              </ul>
            </div>
          </div>
        </FilterSection>

        <!-- Slot for view-specific sections (e.g., Area for fabrics, Sizes for patterns) -->
        <slot :draft="draft" />
      </div>

      <p v-if="rangeError" class="border-t border-border/60 px-4 py-2 text-xs text-destructive" role="alert">
        {{ rangeError }}
      </p>

      <footer class="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-testid="cancel"
          @click="cancel"
        >
          Cancel
        </Button>
        <Button type="button" size="sm" :disabled="!!rangeError" data-testid="apply" @click="apply">
          Apply
        </Button>
      </footer>
    </PopoverContent>
  </Popover>
</template>