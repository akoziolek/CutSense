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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CheckIcon } from 'lucide-vue-next'
import { api, ApiError } from '@/api/client'
import FormFloatingActions from '../forms/FormFloatingActions.vue'

const MAX_NAME_LENGTH = 35
const MAX_DESC_LENGTH = 400

export interface FabricTag {
  id: number
  name: string
}

export interface FabricFormPayload {
  name: string
  description?: string
  tags: FabricTag[]
}

const emit = defineEmits<{
  (e: 'submit', payload: FabricFormPayload): void
  (e: 'cancel'): void
  (e: 'change', payload: Partial<FabricFormPayload>): void
}>()

const props = withDefaults(
  defineProps<{
    name?: string
    description?: string
    tags?: FabricTag[]
    isSubmitting?: boolean
    submitError?: string
  }>(),
  {
    name: '',
    description: '',
    tags: () => [],
    isSubmitting: false,
    submitError: '',
  },
)

const fabricName = ref(props.name)
const description = ref(props.description)
const selectedTagNames = ref<string[]>(props.tags.map((t) => t.name))
const selectedTags = computed<FabricTag[]>(() =>
  selectedTagNames.value
    .map((name) => availableTags.value.find((t) => t.name === name))
    .filter((t): t is FabricTag => t !== undefined),
)

const availableTags = ref<FabricTag[]>([])
const tagLoadError = ref('')

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
    availableTags.value = await api<FabricTag[]>('/fabrics/tags')
  } catch (error) {
    tagLoadError.value =
      error instanceof ApiError
        ? error.body.message
        : 'Could not load fabric tags. Please try again.'
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
    name: fabricName.value.trim(),
    description: description.value.trim() || undefined,
    tags: selectedTags.value,
  })
}

const handleCancel = (event?: Event) => {
  event?.preventDefault()
  emit('cancel')
}

watch(
  () => [props.name, props.description, props.tags] as const,
  ([newName, newDesc, newTags]) => {
    if (newName !== fabricName.value) {
      fabricName.value = newName
    }
    if (newDesc !== description.value) {
      description.value = newDesc
    }
    const incomingNames = newTags.map((t) => t.name)
    if (JSON.stringify(incomingNames) !== JSON.stringify(selectedTagNames.value)) {
      selectedTagNames.value = incomingNames
    }
  },
  { deep: true },
)

watch([fabricName, description, selectedTagNames], () => {
  emit('change', {
    name: fabricName.value,
    description: description.value,
    tags: selectedTags.value,
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
  <div class="w-full space-y-6">
    <!-- 1. Fabric Name -->
    <div class="space-y-2">
      <Label for="fabric-name" class="text-md font-semibold font-inter text-foreground">
        Fabric name <span class="text-destructive">*</span>
      </Label>
      <InputGroup>
        <InputGroupInput
          id="fabric-name"
          v-model="fabricName"
          placeholder="e.g Linen fabric"
          :maxlength="MAX_NAME_LENGTH"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText class="ml-auto text-xs font-mono text-muted-foreground">
            {{ fabricName.length }}/{{ MAX_NAME_LENGTH }}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>

    <!-- 2. Description -->
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

    <!-- 3. Tags -->
    <div class="space-y-2">
      <Label class="text-md font-semibold font-inter text-foreground">Tags</Label>

      <Popover v-model:open="open">
        <ListboxRoot v-model="selectedTagNames" highlight-on-hover multiple>
          <PopoverTrigger as-child>
            <div class="w-full">
              <TagsInput
                v-slot="{ modelValue: tagItems }"
                v-model="selectedTagNames"
                class="w-full flex-col items-start gap-2 p-3 font-inter bg-background border border-input rounded-xl focus-within:ring-2 focus-within:ring-ring"
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
      :disabled="isSubmitting || !fabricName.trim()"
      @cancel="handleCancel"
      @next="handleSubmit"
    />
  </div>
</template>
