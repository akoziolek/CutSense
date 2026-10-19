<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DESC_MAX, NAME_MAX, SIZES, TAG_OPTIONS, useNewPattern } from '@/composables/useNewPattern'

const { draft } = useNewPattern()

const query = ref('')
const tagsOpen = ref(false)
const tagInput = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const active = ref(0)

const options = computed(() =>
  TAG_OPTIONS.filter(
    (tag) => !draft.details.tags.includes(tag) && tag.includes(query.value.trim().toLowerCase()),
  ),
)

watch(options, () => {
  active.value = 0
  if (listRef.value) listRef.value.scrollTop = 0
})

function scrollActiveIntoView() {
  nextTick(() => {
    listRef.value
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  })
}

const addTag = (tag: string) => {
  draft.details.tags.push(tag)
  query.value = ''
}
const removeTag = (tag: string) => {
  draft.details.tags = draft.details.tags.filter((t) => t !== tag)
}

function onKeydown(e: KeyboardEvent) {
  const list = options.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    tagsOpen.value = true
    if (list.length) {
      active.value = (active.value + 1) % list.length
      scrollActiveIntoView()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (list.length) {
      active.value = (active.value - 1 + list.length) % list.length
      scrollActiveIntoView()
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const tag = list[active.value]
    if (tagsOpen.value && tag) addTag(tag)
  } else if (e.key === 'Escape') {
    tagsOpen.value = false
  }
}

function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (!next || !(e.currentTarget as HTMLElement).contains(next)) tagsOpen.value = false
}

const fieldClass =
  'rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border'
</script>

<template>
  <div class="max-w-xl space-y-5">
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-4">
      <label class="space-y-1.5 text-sm font-semibold font-inter">
        <span>Pattern name <span class="text-destructive">*</span></span>
        <Input
          v-model="draft.details.name"
          :maxlength="NAME_MAX"
          placeholder="e.g. Linen fabric"
          class="h-9 font-normal"
        />
      </label>

      <label class="space-y-1.5 text-sm font-semibold font-inter">
        <span>Size <span class="text-destructive">*</span></span>
        <select v-model="draft.details.size" :class="[fieldClass, 'h-9 w-full font-normal']">
          <option value="" disabled></option>
          <option v-for="size in SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
    </div>

    <label class="block space-y-1.5 text-sm font-semibold font-inter">
      <span>Description</span>
      <textarea
        v-model="draft.details.description"
        :maxlength="DESC_MAX"
        rows="4"
        placeholder="Enter composition, weight, or intended use..."
        :class="[fieldClass, 'w-full py-2 font-normal resize-none']"
      />
      <span class="block text-right text-[11px] font-normal text-muted-foreground">
        {{ draft.details.description.length }}/{{ DESC_MAX }}
      </span>
    </label>

    <div class="space-y-1.5">
      <h3 class="text-sm font-semibold font-inter">Tags</h3>
      <div class="relative">
        <div
          :class="[fieldClass, 'flex min-h-9 cursor-text flex-wrap items-center gap-1.5 py-1']"
          @click="tagInput?.focus()"
          @focusin="tagsOpen = true"
          @focusout="onFocusOut"
        >
          <Badge
            v-for="tag in draft.details.tags"
            :key="tag"
            variant="secondary"
            class="gap-1 rounded-md bg-brand-grey text-xs font-normal"
          >
            {{ tag }}
            <button type="button" :aria-label="`Remove ${tag}`" @click.stop="removeTag(tag)">
              <X class="w-3 h-3" />
            </button>
          </Badge>
          <Search v-if="!draft.details.tags.length" class="w-4 h-4 text-muted-foreground" />
          <input
            ref="tagInput"
            v-model="query"
            type="text"
            :placeholder="draft.details.tags.length ? '' : 'Search tags...'"
            class="min-w-24 flex-1 bg-transparent text-sm outline-none"
            @keydown="onKeydown"
          />
        </div>
        <ul
          v-if="tagsOpen && options.length"
          ref="listRef"
          class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md"
        >
          <li v-for="(tag, i) in options" :key="tag">
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-brand-green"
              :class="{ 'bg-brand-green': i === active }"
              :data-active="i === active"
              @mousedown.prevent="addTag(tag)"
            >
              {{ tag }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <fieldset class="space-y-1.5">
      <legend class="text-sm font-semibold font-inter">
        Visibility <span class="text-destructive">*</span>
      </legend>
      <div class="flex gap-5 text-xs">
        <label class="flex items-center gap-1.5">
          <input v-model="draft.details.visibility" type="radio" value="PUBLIC" class="accent-foreground" />
          Public
        </label>
        <label class="flex items-center gap-1.5">
          <input v-model="draft.details.visibility" type="radio" value="PRIVATE" class="accent-foreground" />
          Private
        </label>
      </div>
    </fieldset>

    <p class="text-xs"><span class="text-destructive">*</span> Required field</p>
  </div>
</template>