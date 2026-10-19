<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DESC_MAX, NAME_MAX, SIZES, TAG_OPTIONS, useNewPattern } from '@/composables/useNewPattern'

const { draft } = useNewPattern()

const query = ref('')
const tagsOpen = ref(false)

const options = computed(() =>
  TAG_OPTIONS.filter(
    (tag) => !draft.details.tags.includes(tag) && tag.includes(query.value.trim().toLowerCase()),
  ),
)

const addTag = (tag: string) => {
  draft.details.tags.push(tag)
  query.value = ''
}
const removeTag = (tag: string) => {
  draft.details.tags = draft.details.tags.filter((t) => t !== tag)
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
        <div :class="[fieldClass, 'flex min-h-9 flex-wrap items-center gap-1.5 py-1']">
          <Badge
            v-for="tag in draft.details.tags"
            :key="tag"
            variant="secondary"
            class="gap-1 rounded-md bg-brand-grey text-xs font-normal"
          >
            {{ tag }}
            <button type="button" :aria-label="`Remove ${tag}`" @click="removeTag(tag)">
              <X class="w-3 h-3" />
            </button>
          </Badge>
          <Search class="w-4 h-4 text-muted-foreground" />
          <input
            v-model="query"
            type="text"
            placeholder="Search tags..."
            class="min-w-24 flex-1 bg-transparent text-sm outline-none"
            @focus="tagsOpen = true"
            @blur="tagsOpen = false"
          />
        </div>
        <ul
          v-if="tagsOpen && options.length"
          class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md"
        >
          <li v-for="tag in options" :key="tag">
            <button
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-brand-green"
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