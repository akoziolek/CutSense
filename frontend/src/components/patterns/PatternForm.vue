<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  useFilter,
} from 'reka-ui'
import { Label } from '@/components/ui/label'
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupText,
} from '@/components/ui/input-group'
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CheckIcon } from 'lucide-vue-next'
import { api, ApiError } from '@/api/client'
import FormFloatingActions from '../forms/FormFloatingActions.vue'
import Skeleton from '../ui/skeleton/Skeleton.vue'
import { type NameTag, PatternSize, PatternVisibility } from '@/types/patterns'
import SelectGroup from '../ui/select/SelectGroup.vue'
import SelectLabel from '../ui/select/SelectLabel.vue'
import RadioGroup from '../ui/radio-group/RadioGroup.vue'
import RadioGroupItem from '../ui/radio-group/RadioGroupItem.vue'

const SIZES = Object.values(PatternSize)
const MAX_NAME_LENGTH = 35
const MAX_DESC_LENGTH = 400

export interface PatternFormPayload {
  name: string
  size: PatternSize | string
  description?: string
  tags: NameTag[]
  visibility: PatternVisibility | string
}

const emit = defineEmits<{
  (e: 'submit', payload: PatternFormPayload): void
  (e: 'cancel'): void
  (e: 'change', payload: Partial<PatternFormPayload>): void
}>()

const props = withDefaults(
  defineProps<{
    name?: string
    size?: PatternSize | string
    description?: string
    tags?: NameTag[]
    visibility?: PatternVisibility | string
    isSubmitting?: boolean
    isLoading?: boolean
    submitError?: string
  }>(),
  {
    name: '',
    size: '',
    description: '',
    tags: () => [],
    visibility: PatternVisibility.PRIVATE,
    isSubmitting: false,
    isLoading: false,
    submitError: '',
  },
)

const patternName = ref(props.name)
const size = ref(props.size)
const description = ref(props.description)
const visibility = ref(props.visibility)

const selectedTagNames = ref<string[]>(props.tags ? props.tags.map((tag) => tag.name) : [])
const availableTags = ref<NameTag[]>([])
const tagLoadError = ref('')

const knownTagsMap = computed(() => {
  const map = new Map<string, NameTag>()

  if (Array.isArray(props.tags)) {
    props.tags.forEach((tag) => {
      if (typeof tag === 'object' && tag && tag.name) {
        map.set(tag.name.toLowerCase(), tag)
      }
    })
  }

  availableTags.value.forEach((tag) => {
    if (tag && tag.name) {
      map.set(tag.name.toLowerCase(), tag)
    }
  })

  return map
})

const selectedTags = computed<NameTag[]>(() => {
  return selectedTagNames.value.map((name) => {
    const lower = name.toLowerCase()
    return knownTagsMap.value.get(lower) || { id: -1, name }
  })
})

const searchTerm = ref('')
const open = ref(false)

const { contains } = useFilter({ sensitivity: 'base' })
const filteredTags = computed(() =>
  searchTerm.value === ''
    ? availableTags.value
    : availableTags.value.filter((tag) => contains(tag.name, searchTerm.value)),
)

const loadAvailableTags = async () => {
  tagLoadError.value = ''
  try {
    console.log(availableTags.value)

    availableTags.value = await api<NameTag[]>('/patterns/tags')
  } catch (error) {
    tagLoadError.value =
      error instanceof ApiError
        ? error.body.message
        : 'Could not load pattern tags. Please try again.'
  }
}

const handleEnterKey = () => {
  const trimmed = searchTerm.value.trim()
  if (!trimmed) return

  const existingTag = availableTags.value.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
  )

  if (existingTag && !selectedTagNames.value.includes(existingTag.name)) {
    selectedTagNames.value = [...selectedTagNames.value, existingTag.name]
    searchTerm.value = ''
    open.value = false
  }
}

const handleSubmit = (event?: Event) => {
  event?.preventDefault()
  emit('submit', {
    name: patternName.value.trim(),
    size: size.value,
    description: description.value || undefined,
    tags: selectedTags.value,
    visibility: visibility.value,
  })
}

const handleCancel = (event?: Event) => {
  event?.preventDefault()
  emit('cancel')
}

let isSyncingFromProps = false

watch(
  () => [props.name, props.size, props.description, props.tags, props.visibility] as const,
  ([newName, newSize, newDesc, newTags, newVis]) => {
    isSyncingFromProps = true

    if (newName !== patternName.value) patternName.value = newName
    if (newSize !== size.value) size.value = newSize
    if (newDesc !== description.value) description.value = newDesc
    if (newVis !== visibility.value) visibility.value = newVis

    const parsedNames = newTags ? newTags.map((tag) => tag.name) : []
    if (JSON.stringify(parsedNames) !== JSON.stringify(selectedTagNames.value)) {
      selectedTagNames.value = parsedNames
    }

    isSyncingFromProps = false
  },
  { deep: true },
)

watch([patternName, size, description, selectedTagNames, visibility], () => {
  if (isSyncingFromProps) return

  emit('change', {
    name: patternName.value,
    size: size.value,
    description: description.value,
    tags: selectedTags.value,
    visibility: visibility.value,
  })
})

watch(searchTerm, () => {
  open.value = true
})

onMounted(() => {
  void loadAvailableTags()
})
</script>

<template>
  <div v-if="isLoading" class="w-full space-y-6">
    <div class="space-y-2">
      <Skeleton class="h-4 w-28" />
      <Skeleton class="h-10 w-full rounded-md" />
    </div>

    <div class="space-y-2 max-w-sm">
      <Skeleton class="h-4 w-12" />
      <Skeleton class="h-10 w-full rounded-md" />
    </div>

    <div class="space-y-2">
      <Skeleton class="h-4 w-20" />
      <div class="flex gap-6 py-1">
        <div class="flex items-center gap-2">
          <Skeleton class="h-4 w-4 rounded-full" />
          <Skeleton class="h-4 w-12" />
        </div>
        <div class="flex items-center gap-2">
          <Skeleton class="h-4 w-4 rounded-full" />
          <Skeleton class="h-4 w-14" />
        </div>
      </div>
    </div>

    <div class="space-y-2">
      <Skeleton class="h-4 w-24" />
      <Skeleton class="h-28 w-full rounded-md" />
    </div>

    <div class="space-y-2">
      <Skeleton class="h-4 w-12" />
      <div class="flex gap-2 p-3 border border-input rounded-md">
        <Skeleton class="h-6 w-16 rounded-md" />
        <Skeleton class="h-6 w-20 rounded-md" />
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <Skeleton class="h-10 w-24 rounded-md" />
      <Skeleton class="h-10 w-28 rounded-md" />
    </div>
  </div>

  <div v-else class="w-full space-y-6">
    <div class="space-y-2">
      <Label for="pattern-name" class="text-md font-semibold font-inter text-foreground">
        Pattern name <span class="text-destructive">*</span>
      </Label>
      <InputGroup>
        <InputGroupInput
          id="pattern-name"
          v-model="patternName"
          placeholder="e.g. Summer Dress Pattern"
          :maxlength="MAX_NAME_LENGTH"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText class="ml-auto text-xs font-mono text-muted-foreground">
            {{ patternName.length }}/{{ MAX_NAME_LENGTH }}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>

    <div class="space-y-2 max-w-sm">
      <Label class="text-md font-semibold font-inter text-foreground">
        Size <span class="text-destructive">*</span>
      </Label>
      <Select v-model="size">
        <SelectTrigger class="w-full h-10 rounded-md bg-background border-input font-inter">
          <SelectValue placeholder="Select size" />
        </SelectTrigger>
        <SelectContent class="rounded-md border-border bg-popover font-inter">
          <SelectGroup>
            <SelectLabel>Size</SelectLabel>
            <SelectItem v-for="size in SIZES" :key="size" :value="size" class="rounded-md cursor-pointer">
              {{ size }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label class="text-md font-semibold font-inter text-foreground">
        Visibility <span class="text-destructive">*</span>
      </Label>
      <RadioGroup v-model="visibility" class="flex gap-6">
        <div class="flex items-center gap-2">
          <RadioGroupItem id="visibility-public" :value="PatternVisibility.PUBLIC" />
          <Label for="visibility-public" class="text-sm font-normal cursor-pointer font-inter">
            Public
          </Label>
        </div>
        <div class="flex items-center gap-2">
          <RadioGroupItem id="visibility-private" :value="PatternVisibility.PRIVATE" />
          <Label for="visibility-private" class="text-sm font-normal cursor-pointer font-inter">
            Private
          </Label>
        </div>
      </RadioGroup>
    </div>

    <div class="space-y-2">
      <Label for="description" class="text-md font-semibold font-inter text-foreground">
        Description
      </Label>
      <InputGroup>
        <InputGroupTextarea
          id="description"
          v-model="description"
          placeholder="Enter composition, weight, or intended use..."
          :maxlength="MAX_DESC_LENGTH"
          rows="4"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText class="ml-auto text-xs font-mono text-muted-foreground">
            {{ description.length }}/{{ MAX_DESC_LENGTH }}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>

    <div class="space-y-2">
      <Label class="text-md font-semibold font-inter text-foreground">Tags</Label>

      <Popover v-model:open="open">
        <ListboxRoot v-model="selectedTagNames" highlight-on-hover multiple>
          <PopoverTrigger as-child>
            <div class="w-full">
              <TagsInput
                v-slot="{ modelValue: tagItems }"
                v-model="selectedTagNames"
                class="w-full flex-col items-start gap-2 p-3 font-inter bg-background border border-input rounded-md focus-within:ring-2 focus-within:ring-ring"
              >
                <div v-if="tagItems.length > 0" class="flex flex-wrap gap-1.5 w-full">
                  <TagsInputItem
                    v-for="item in tagItems"
                    :key="String(item)"
                    :value="item"
                    class="bg-brand-grey border border-input px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                  >
                    <TagsInputItemText />
                    <TagsInputItemDelete />
                  </TagsInputItem>
                </div>

                <div class="flex items-center w-full gap-2">
                  <ListboxFilter v-model="searchTerm" as-child>
                    <TagsInputInput
                      placeholder="Search or add tags..."
                      class="w-full text-sm bg-transparent p-0 focus:outline-hidden border-none shadow-none cursor-text"
                      @keydown.enter.prevent="handleEnterKey"
                    />
                  </ListboxFilter>
                </div>
              </TagsInput>
            </div>
          </PopoverTrigger>

          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="6"
            class="w-[var(--reka-popper-anchor-width)] p-1 bg-popover rounded-xl border border-border shadow-md max-w-none"
            @open-auto-focus.prevent
          >
            <ListboxContent
              class="max-h-[144px] scroll-py-1 overflow-x-hidden overflow-y-auto space-y-0.5 empty:after:content-['No_matching_tags'] empty:p-3 empty:text-xs empty:text-center empty:text-muted-foreground empty:after:block"
              tabindex="-1"
            >
              <ListboxItem
                v-for="item in filteredTags"
                :key="item.id"
                :value="item.name"
                class="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-inter outline-hidden select-none"
                @select="searchTerm = ''"
              >
                <span>{{ item.name }}</span>

                <ListboxItemIndicator class="ml-auto inline-flex items-center justify-center">
                  <CheckIcon class="h-4 w-4 text-primary" />
                </ListboxItemIndicator>
              </ListboxItem>
            </ListboxContent>
          </PopoverContent>
        </ListboxRoot>
      </Popover>

      <p v-if="tagLoadError" class="text-xs text-destructive" role="alert">
        {{ tagLoadError }}
        <button type="button" class="underline underline-offset-2" @click="loadAvailableTags">
          Try again
        </button>
      </p>
    </div>

    <p v-if="submitError" class="text-xs text-destructive" role="alert">
      {{ submitError }}
    </p>

    <p class="text-xs text-destructive pt-2">* Required field</p>

    <FormFloatingActions
      cancel-label="Cancel"
      next-label="Save"
      :disabled="isSubmitting || !patternName.trim() || !size"
      @cancel="handleCancel"
      @next="handleSubmit"
    />
  </div>
</template>
