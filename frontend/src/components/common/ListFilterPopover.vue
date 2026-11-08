<script setup lang="ts" generic="F extends BaseFilters">
import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, ListFilter, Search } from 'lucide-vue-next'
import {
  ListboxRoot,
  ListboxFilter,
  ListboxContent,
  ListboxItem,
  ListboxItemIndicator,
} from 'radix-vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  TagsInput,
  TagsInputItem,
  TagsInputItemText,
  TagsInputItemDelete,
  TagsInputInput,
} from '@/components/ui/tags-input'
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
  { showFavourites: true, showCommunity: false },
)

const emit = defineEmits<{
  (e: 'apply', filters: F): void
  (e: 'opened'): void
}>()
const { t } = useI18n()

const clone = (f: F): F => JSON.parse(JSON.stringify(f))
const draft = ref(clone(props.modelValue)) as Ref<F>

const isOpen = ref(false)
const tagsPopoverOpen = ref(false)
const tagQuery = ref('')

watch(isOpen, (open) => {
  if (!open) return
  draft.value = clone(props.modelValue)
  tagQuery.value = ''
  tagsPopoverOpen.value = false
  emit('opened')
})

const rangeError = computed(() => {
  const { createdFrom, createdTo } = draft.value
  if (createdFrom && createdTo && createdFrom > createdTo)
    return t('common.filters.startDateAfterEndDate')
  return props.extraError?.(draft.value) ?? ''
})

const clearAll = () => {
  draft.value = props.emptyFilters()
  tagQuery.value = ''
}

const selectedTagNames = computed<string[]>({
  get: () => props.tags.filter((t) => draft.value.tagIds.includes(t.id)).map((t) => t.name),
  set: (newNames: string[]) => {
    draft.value.tagIds = props.tags.filter((t) => newNames.includes(t.name)).map((t) => t.id)
  },
})

const visibleTags = computed(() => {
  const q = tagQuery.value.trim().toLowerCase()
  return props.tags.filter((t) => t.name.toLowerCase().includes(q))
})

const removeTagByName = (tagName: string) => {
  const tag = props.tags.find((t) => t.name === tagName)
  if (tag) {
    draft.value.tagIds = draft.value.tagIds.filter((id) => id !== tag.id)
  }
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
        class="gap-2 py-4 hover:text-primary"
        :class="{ 'bg-brand-pink': active }"
        data-testid="filter-trigger"
      >
        <ListFilter class="size-4" />
        {{ t('common.actions.filter') }}
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" :sideOffset="12" class="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
      <header class="flex items-center justify-between px-4 py-3">
        <h2 class="text-sm font-bold font-inter">{{ t('common.filters.detailed') }}</h2>
        <button
          type="button"
          class="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          data-testid="clear"
          @click="clearAll"
        >
          {{ t('common.actions.clearAll') }}
        </button>
      </header>

      <div class="max-h-[55vh] overflow-y-auto">
        <!-- Date range section -->
        <FilterSection :title="t('common.filters.dateRange')" :default-open="true">
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1 text-xs">
              <span>{{ t('common.filters.from') }}</span>
              <Input
                v-model="draft.createdFrom"
                type="date"
                :max="draft.createdTo || undefined"
                class="h-8 text-xs text-foreground"
                data-testid="date-from"
              />
            </label>
            <label class="space-y-1 text-xs">
              <span>{{ t('common.filters.to') }}</span>
              <Input
                v-model="draft.createdTo"
                type="date"
                :min="draft.createdFrom || undefined"
                class="h-8 text-xs text-foreground"
                data-testid="date-to"
              />
            </label>
          </div>
        </FilterSection>

        <!-- Only favourites -->
        <div
          v-if="showFavourites"
          class="flex items-center justify-between border-t border-muted px-4 py-3"
        >
          <Label for="filter-fav-only" class="cursor-pointer text-sm font-semibold font-inter">
            {{ t('common.filters.onlyFavourites') }}
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">{{
              t(draft.favouriteOnly ? 'common.filters.yes' : 'common.filters.no')
            }}</span>
            <Switch id="filter-fav-only" v-model="draft.favouriteOnly" data-testid="fav-only" />
          </div>
        </div>

        <!-- Only community toggle -->
        <div
          v-if="showCommunity"
          class="flex items-center justify-between border-t border-muted px-4 py-3"
        >
          <Label for="filter-community" class="cursor-pointer text-sm font-semibold font-inter">
            {{ t('common.filters.community') }}
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">{{
              t((draft as any).communityOnly ? 'common.filters.yes' : 'common.filters.no')
            }}</span>
            <Switch
              id="filter-community"
              v-model="(draft as any).communityOnly"
              data-testid="community-only"
            />
          </div>
        </div>

        <FilterSection :title="t('common.filters.tags')" :default-open="false">
          <div class="space-y-2">
            <p class="text-xs text-muted-foreground">
              {{ t('common.filters.itemsWithSelectedTags') }}
            </p>

            <Popover v-model:open="tagsPopoverOpen">
              <ListboxRoot v-model="selectedTagNames" highlight-on-hover multiple>
                <PopoverTrigger as-child>
                  <div class="w-full">
                    <TagsInput
                      v-slot="{ modelValue: tagItems }"
                      v-model="selectedTagNames"
                      class="w-full flex-col items-start gap-2 p-2.5 font-inter bg-background! border border-input rounded-md focus-within:ring-2 focus-within:ring-ring"
                    >
                      <div v-if="tagItems.length > 0" class="flex flex-wrap gap-1.5 w-full">
                        <TagsInputItem
                          v-for="item in tagItems"
                          :key="String(item)"
                          :value="item"
                          class="bg-brand-grey border border-input px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          <TagsInputItemText />
                          <TagsInputItemDelete @click.prevent="removeTagByName(String(item))" />
                        </TagsInputItem>
                      </div>

                      <div class="flex items-center w-full gap-2 relative">
                        <Search
                          class="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                        />
                        <ListboxFilter v-model="tagQuery" as-child>
                          <TagsInputInput
                            :placeholder="t('common.filters.searchTags')"
                            class="w-full text-xs bg-transparent pl-5 pr-2 py-1 focus:outline-hidden border-none shadow-none cursor-text placeholder:text-muted-foreground"
                            @keydown.enter.prevent
                          />
                        </ListboxFilter>
                      </div>
                    </TagsInput>
                  </div>
                </PopoverTrigger>

                <PopoverContent
                  side="bottom"
                  align="start"
                  :side-offset="4"
                  class="w-[var(--radix-popper-anchor-width,var(--reka-popper-anchor-width))] p-1 bg-popover rounded-xl border border-border shadow-md max-w-none z-50"
                  @open-auto-focus.prevent
                >
                  <ListboxContent
                    class="max-h-[144px] scroll-py-1 overflow-x-hidden overflow-y-auto space-y-0.5 empty:after:content-[attr(data-empty)] empty:p-3 empty:text-xs empty:text-center empty:text-muted-foreground empty:after:block"
                    :data-empty="
                      tagsLoading
                        ? t('common.status.loadingTags')
                        : t('common.status.noMatchingTags')
                    "
                    tabindex="-1"
                  >
                    <ListboxItem
                      v-for="tag in visibleTags"
                      :key="tag.id"
                      :value="tag.name"
                      class="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs font-inter outline-hidden select-none"
                      @select="tagQuery = ''"
                    >
                      <span>{{ tag.name }}</span>

                      <ListboxItemIndicator class="ml-auto inline-flex items-center justify-center">
                        <Check class="h-3.5 w-3.5 text-primary" />
                      </ListboxItemIndicator>
                    </ListboxItem>
                  </ListboxContent>
                </PopoverContent>
              </ListboxRoot>
            </Popover>

            <p v-if="tagsError" class="mt-1 text-xs text-destructive" role="alert">
              {{ tagsError }}
            </p>
          </div>
        </FilterSection>

        <!-- Dynamic slot -->
        <slot :draft="draft" />
      </div>

      <p
        v-if="rangeError"
        class="border-t border-border/60 px-4 py-2 text-xs text-destructive"
        role="alert"
      >
        {{ rangeError }}
      </p>

      <footer class="flex items-center justify-end gap-2 border-t border-muted px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-testid="cancel"
          @click="cancel"
        >
          {{ t('common.actions.cancel') }}
        </Button>
        <Button type="button" size="sm" :disabled="!!rangeError" data-testid="apply" @click="apply">
          {{ t('common.actions.apply') }}
        </Button>
      </footer>
    </PopoverContent>
  </Popover>
</template>
