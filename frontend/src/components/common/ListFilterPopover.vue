<script setup lang="ts" generic="F extends BaseFilters">
import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ListFilter } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { NameTag } from '@/types/fabric'
import FilterSection from '@/components/common/FilterSection.vue'
import FilterMultiSelect from '@/components/common/FilterMultiSelect.vue'
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
    showTags?: boolean
    extraError?: (filters: F) => string
  }>(),
  { showFavourites: true, showCommunity: false, showTags: true },
)

const emit = defineEmits<{
  (e: 'apply', filters: F): void
  (e: 'opened'): void
}>()

const { t } = useI18n()

const clone = (f: F): F => JSON.parse(JSON.stringify(f))
const draft = ref(clone(props.modelValue)) as Ref<F>

const isOpen = ref(false)

watch(isOpen, (open) => {
  if (!open) return
  draft.value = clone(props.modelValue)
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
        <!-- Date range -->
        <FilterSection :title="t('common.filters.dateRange')" :default-open="true">
          <div class="grid grid-cols-2 gap-2">
            <label class="space-y-1 text-xs">
              <span>{{ t('common.filters.from') }}</span>
              <Input
                v-model="draft.createdFrom"
                type="date"
                :max="draft.createdTo || undefined"
                class="h-8 text-xs"
                data-testid="date-from"
              />
            </label>
            <label class="space-y-1 text-xs">
              <span>{{ t('common.filters.to') }}</span>
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
        <div
          v-if="showFavourites"
          class="flex items-center justify-between border-t border-border/60 px-4 py-3"
        >
          <Label for="filter-fav-only" class="cursor-pointer text-sm font-semibold font-inter">
            {{ t('common.filters.onlyFavourites') }}
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">
              {{ draft.favouriteOnly ? t('common.filters.yes') : t('common.filters.no') }}
            </span>
            <Switch id="filter-fav-only" v-model="draft.favouriteOnly" data-testid="fav-only" />
          </div>
        </div>

        <!-- Community -->
        <div
          v-if="showCommunity"
          class="flex items-center justify-between border-t border-border/60 px-4 py-3"
        >
          <Label for="filter-community" class="cursor-pointer text-sm font-semibold font-inter">
            {{ t('common.filters.community') }}
          </Label>
          <div class="flex items-center gap-2">
            <span class="text-xs">
              {{ (draft as any).communityOnly ? t('common.filters.yes') : t('common.filters.no') }}
            </span>
            <Switch
              id="filter-community"
              v-model="(draft as any).communityOnly"
              data-testid="community-only"
            />
          </div>
        </div>

        <!-- Tags -->
        <FilterSection v-if="showTags" :title="t('common.filters.tags')" :default-open="false">
          <div class="space-y-2">
            <p class="text-xs text-muted-foreground">
              {{ t('common.filters.itemsWithSelectedTags') }}
            </p>
            <FilterMultiSelect
              v-model="draft.tagIds"
              :options="tags"
              :loading="tagsLoading"
              :error="tagsError"
              :placeholder="t('common.filters.searchTags')"
            />
          </div>
        </FilterSection>

        <!-- view-specific sections (Area for fabrics, Size for patterns, Pattern/Fabric/Algorithm for optimizations) -->
        <slot :draft="draft" />
      </div>

      <p
        v-if="rangeError"
        class="border-t border-border/60 px-4 py-2 text-xs text-destructive"
        role="alert"
      >
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
          {{ t('common.actions.cancel') }}
        </Button>
        <Button type="button" size="sm" :disabled="!!rangeError" data-testid="apply" @click="apply">
          {{ t('common.actions.apply') }}
        </Button>
      </footer>
    </PopoverContent>
  </Popover>
</template>